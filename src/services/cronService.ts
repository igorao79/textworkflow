import * as cron from 'node-cron';
import { executeWorkflow, getWorkflows } from './workflowService';

// Импортируем функции для работы с файлами
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

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
import { Workflow } from '../types/workflow';

const runningTasks = new Map<string, cron.ScheduledTask>();

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

            console.log(`🚀 CronService: Starting workflow execution for ${workflow.id}`);

            await executeWorkflow(workflow.id, {
              trigger: 'cron',
              timestamp: new Date().toISOString(),
              timezone: timezone
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
  const tasks = [];
  for (const [workflowId, task] of runningTasks) {
    tasks.push({
      workflowId,
      isRunning: !task.destroyed,
      nextExecution: getNextExecutionTime(task),
    });
  }
  return tasks;
}

export function stopCronTask(workflowId: string) {
  const task = runningTasks.get(workflowId);
  if (task) {
    task.stop();
    runningTasks.delete(workflowId);
    return true;
  }
  return false;
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
  }, {} as Record<string, typeof executions>);

  // Проверяем каждый workflow
  for (const [workflowId, workflowExecutions] of Object.entries(executionsByWorkflow)) {
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

// Инициализируем cron scheduler при запуске
if (typeof window === 'undefined') { // Только на сервере
  startCronScheduler();
}
