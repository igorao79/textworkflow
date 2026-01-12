import * as cron from 'node-cron';
import { executeWorkflow, getWorkflows } from './workflowService';
import { workflowQueue } from '../lib/queue';
import { WorkflowExecution } from '../types/workflow';

// Импортируем функции для работы с файлами
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');
const CRON_TASKS_FILE = path.join(DATA_DIR, 'cron-tasks.json');

// Map для хранения активных cron задач (workflowId -> cron.ScheduledTask)
const runningTasks = new Map<string, any>();

function loadExecutions(): any[] {
  try {
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map((execution: any) => ({
        ...execution,
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
      }));
    }
  } catch (error) {
    console.error('Error loading executions:', error);
  }
  return [];
}

function saveExecutions(executions: any[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
  } catch (error) {
    console.error('Error saving executions:', error);
  }
}

function updateExecutionInFile(updatedExecution: any): void {
  try {
    const executions = loadExecutions();
    const index = executions.findIndex(e => e.id === updatedExecution.id);
    if (index !== -1) {
      executions[index] = updatedExecution;
      saveExecutions(executions);
    }
  } catch (error) {
    console.error('Error updating execution in file:', error);
  }
}

// Функции для сохранения/загрузки cron задач
function loadCronTasks(): string[] {
  try {
    if (fs.existsSync(CRON_TASKS_FILE)) {
      const data = fs.readFileSync(CRON_TASKS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading cron tasks:', error);
  }
  return [];
}

function saveCronTasks(workflowIds: string[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CRON_TASKS_FILE, JSON.stringify(workflowIds, null, 2));
  } catch (error) {
    console.error('Error saving cron tasks:', error);
  }
}

export function startCronScheduler() {
  // НЕ восстанавливаем cron задачи автоматически при запуске сервера
  // Пользователь должен сам запускать их через интерфейс

  // Только проверяем дубликаты каждые 5 секунд
  cron.schedule('*/5 * * * * *', async () => {
    try {
      await checkAndStopDuplicateTasks();
    } catch (error) {
      console.error('Error checking duplicate tasks:', error);
    }
  });
}

export async function updateCronTasks() {
  console.log('🔄 CronService: Starting updateCronTasks()');

  const workflows = getWorkflows();
  const cronWorkflows = workflows.filter(w => w.isActive && w.trigger.type === 'cron');

  console.log(`📅 CronService: Found ${cronWorkflows.length} active cron workflows`);
  console.log('📋 CronService: Cron workflows:', cronWorkflows.map(w => ({ id: w.id, schedule: (w.trigger.config as any)?.schedule })));

  // Останавливаем задачи для workflow, которые больше не активны или изменили тип
  for (const [workflowId, task] of runningTasks) {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow || !workflow.isActive || workflow.trigger.type !== 'cron') {
      task.stop();
      runningTasks.delete(workflowId);
    }
  }

  // Создаем или обновляем задачи для активных cron workflow
  for (const workflow of cronWorkflows) {
    console.log(`🔄 CronService: Processing workflow ${workflow.id}`);

    const cronConfig = workflow.trigger.config as any;
    const schedule = cronConfig.schedule;
    const timezone = cronConfig.timezone || 'Europe/Moscow';

    console.log(`📅 CronService: Workflow ${workflow.id} - schedule: "${schedule}", timezone: "${timezone}"`);

    if (!schedule) {
      console.warn(`⚠️ CronService: Workflow ${workflow.id} has cron trigger but no schedule`);
      continue;
    }

    // Проверяем, изменилось ли расписание
    const existingTask = runningTasks.get(workflow.id);
    const needsUpdate = !existingTask || !existingTask.destroyed;

    console.log(`🔍 CronService: Workflow ${workflow.id} - existing task: ${!!existingTask}, needs update: ${needsUpdate}`);

    if (needsUpdate) {
      // Останавливаем старую задачу если есть
      if (existingTask) {
        console.log(`🛑 CronService: Stopping existing task for workflow ${workflow.id}`);
        existingTask.stop();
      }

      console.log(`🚀 CronService: Creating new cron task for workflow ${workflow.id}`);

      try {
        const task = cron.schedule(schedule, async () => {
          console.log(`⏰ CronService: CRON TASK TRIGGERED for workflow ${workflow.id} at ${new Date().toISOString()}`);

          try {
            console.log(`🔍 CronService: Checking running executions for workflow ${workflow.id}`);

            // Проверяем, не выполняется ли уже этот workflow
            const executions = loadExecutions();
            const runningExecutions = executions.filter(e =>
              e.workflowId === workflow.id &&
              (e.status === 'running' || (e.status === 'completed' && new Date(e.startedAt).getTime() > Date.now() - 60000)) // Не старше 1 минуты
            );

            console.log(`📊 CronService: Found ${runningExecutions.length} recent executions for workflow ${workflow.id}`);

            if (runningExecutions.length > 0) {
              console.log(`⏰ CronService: Skipping cron execution for ${workflow.id} - ${runningExecutions.length} executions still running or recently completed`);
              return;
            }

            console.log(`🚀 CronService: Adding workflow ${workflow.id} to execution queue`);

            // Добавляем задачу в очередь выполнения вместо прямого выполнения
            await workflowQueue.add({
              workflowId: workflow.id,
              triggerData: {
                trigger: 'cron',
                timestamp: new Date().toISOString(),
                timezone: timezone
              }
            });

            console.log(`✅ CronService: Workflow execution completed for ${workflow.id}`);

          } catch (error) {
            console.error(`❌ CronService: Cron workflow ${workflow.id} execution failed:`, error);
          }
        }, {
          timezone: timezone
        });

        runningTasks.set(workflow.id, task);
        console.log(`✅ CronService: Cron task created successfully for workflow ${workflow.id}`);
      } catch (error) {
        console.error(`💥 CronService: Failed to create cron task for workflow ${workflow.id}:`, error);
      }
    }
  }
}

export function stopCronScheduler() {
  for (const [workflowId, task] of runningTasks) {
    task.stop();
  }

  runningTasks.clear();
}

export function getActiveCronTasks() {
  console.log('🔍 getActiveCronTasks: runningTasks size:', runningTasks.size);
  const tasks = [];
  for (const [workflowId, task] of runningTasks) {
    console.log('📋 getActiveCronTasks: found task for workflow:', workflowId, 'destroyed:', task.destroyed);
    tasks.push({
      workflowId,
      isRunning: !task.destroyed,
      nextExecution: getNextExecutionTime(task),
    });
  }
  console.log('✅ getActiveCronTasks: returning tasks:', tasks.length);
  return tasks;
}

export function stopCronTask(workflowId: string) {
  console.log('🛑 stopCronTask: Deactivating cron task for workflow:', workflowId);

  // Загружаем текущие активные задачи и удаляем этот workflowId
  const currentActiveIds = loadCronTasks();
  const updatedActiveIds = currentActiveIds.filter(id => id !== workflowId);

  if (currentActiveIds.length !== updatedActiveIds.length) {
    saveCronTasks(updatedActiveIds);
    console.log('💾 stopCronTask: Updated saved cron tasks after stopping:', workflowId, 'remaining:', updatedActiveIds);
    return true;
  }

  console.log('⚠️ stopCronTask: Workflow was not in active list:', workflowId);
  return false;
}

export async function startCronTask(workflowId: string) {
  console.log('🚀 startCronTask: Activating cron task for workflow:', workflowId);

  const workflows = getWorkflows();
  const workflow = workflows.find(w => w.id === workflowId);

  if (!workflow) {
    console.error('❌ startCronTask: Workflow not found:', workflowId);
    return false;
  }

  if (!workflow.isActive || workflow.trigger.type !== 'cron') {
    console.error('❌ startCronTask: Workflow is not active or not a cron workflow:', workflowId);
    return false;
  }

  // Проверяем наличие расписания
  const cronConfig = workflow.trigger.config as any;
  if (!cronConfig.schedule) {
    console.error('❌ startCronTask: No schedule found for workflow:', workflowId);
    return false;
  }

  console.log('📅 startCronTask: Activating cron task for workflow:', workflowId, 'schedule:', cronConfig.schedule);

  try {
    // Загружаем текущие активные задачи
    const currentActiveIds = loadCronTasks();

    // Добавляем новый ID если его нет
    if (!currentActiveIds.includes(workflowId)) {
      currentActiveIds.push(workflowId);
      saveCronTasks(currentActiveIds);
      console.log('💾 startCronTask: Saved active cron tasks to file:', currentActiveIds);
    }

    console.log('✅ startCronTask: Cron task activated for workflow:', workflowId);
    return true;
  } catch (error) {
    console.error('💥 startCronTask: Error activating cron task:', error);
    return false;
  }
}

function getNextExecutionTime(task: cron.ScheduledTask): Date | null {
  // node-cron не предоставляет прямой доступ к следующему времени выполнения
  // Возвращаем null, так как сложно получить эту информацию
  return null;
}

async function checkAndStopDuplicateTasks() {
  const executions = loadExecutions();
  const workflows = getWorkflows();

  // Группируем executions по workflowId
  const executionsByWorkflow = executions.reduce((acc, execution) => {
    if (!acc[execution.workflowId]) {
      acc[execution.workflowId] = [];
    }
    acc[execution.workflowId].push(execution);
    return acc;
  }, {} as Record<string, WorkflowExecution[]>);

  // Проверяем каждый workflow
  for (const [workflowId, workflowExecutions] of Object.entries(executionsByWorkflow) as [string, WorkflowExecution[]][]) {
    const runningExecutions = workflowExecutions.filter(e => e.status === 'running');

            if (runningExecutions.length > 1) {
              // Оставляем только самую свежую execution, остальные помечаем как failed
              const sortedExecutions = runningExecutions.sort((a, b) =>
                new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
              );

              for (let i = 1; i < sortedExecutions.length; i++) {
                const execution = sortedExecutions[i];
                execution.status = 'failed';
                execution.error = 'Duplicate execution stopped';
                execution.completedAt = new Date();
                updateExecutionInFile(execution);
              }
            }
  }
}

// Функция для восстановления cron задач после перезапуска сервера
async function restoreCronTasks(): Promise<void> {
  console.log('🔄 restoreCronTasks: Restoring cron tasks from saved state');

  const savedWorkflowIds = loadCronTasks();
  console.log('📋 restoreCronTasks: Found saved workflow IDs:', savedWorkflowIds);

  for (const workflowId of savedWorkflowIds) {
    try {
      console.log('🚀 restoreCronTasks: Restoring cron task for workflow:', workflowId);
      const success = await startCronTask(workflowId);
      if (success) {
        console.log('✅ restoreCronTasks: Successfully restored cron task for:', workflowId);
      } else {
        console.log('❌ restoreCronTasks: Failed to restore cron task for:', workflowId);
      }
    } catch (error) {
      console.error('💥 restoreCronTasks: Error restoring cron task for', workflowId, ':', error);
    }
  }
}

// ВНИМАНИЕ: Cron scheduler теперь запускается в отдельном worker процессе
// См. src/workers/workflow-worker.ts
//
// В cronService остается только:
// - Управление списком активных задач
// - Сохранение/загрузка из файла
// - API функции для активации/деактивации

if (typeof window === 'undefined') { // Только на сервере
  // Не запускаем cron scheduler здесь - он в worker процессе
  console.log('ℹ️ Cron service loaded - scheduler runs in separate worker process');
}
