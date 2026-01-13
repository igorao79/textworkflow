import * as cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { executeWorkflow, getWorkflows, saveWorkflows, getExecutions } from './workflowService';
import { WorkflowExecution, Workflow } from '../types/workflow';
import { addTask } from '../lib/queue-visualization';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

function loadExecutions(): WorkflowExecution[] {
  try {
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map((execution: WorkflowExecution) => ({
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

function saveExecutions(executions: WorkflowExecution[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
  } catch (error) {
    console.error('Error saving executions:', error);
  }
}

function updateExecutionInFile(updatedExecution: WorkflowExecution): void {
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

const runningTasks = new Map<string, cron.ScheduledTask>();
let isFirstStart = true;

// Функция для выполнения cron workflow с отслеживанием в PQueue
async function executeWorkflowWithQueueTracking(workflow: Workflow, timezone: string): Promise<void> {
  console.log(`🔄 EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING START for workflow ${workflow.id} at ${new Date().toISOString()}`);

  // Добавляем задачу в PQueue для отображения в статистике очереди
  const taskId = addTask(`Cron workflow: ${workflow.name || workflow.id}`, 1);
  console.log(`📋 PQUEUE TASK ADDED: ${taskId} for workflow ${workflow.id}`);

  // Добавляем небольшую задержку, чтобы задача была видна в статистике
  console.log(`⏳ WAITING 5 seconds before executing workflow...`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 секунд
  console.log(`✅ WAIT COMPLETE, starting workflow execution`);

  await executeWorkflow(workflow.id, {
    trigger: 'cron' as const,
    timestamp: new Date().toISOString(),
    timezone: timezone
  });

  console.log(`✅ EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING COMPLETE for workflow ${workflow.id}`);
}

function resetAllCronTasks(): void {
  console.log('🔄 CronService: Resetting all cron tasks on server startup...');

  try {
    // Деактивируем все cron workflow ТОЛЬКО при первом запуске сервера
    if (isFirstStart) {
      const workflows = getWorkflows();
      let resetCount = 0;

      const updatedWorkflows = workflows.map(workflow => {
        if (workflow.trigger.type === 'cron' && workflow.isActive) {
          console.log(`🔄 CronService: Deactivating cron workflow: ${workflow.name} (${workflow.id})`);
          resetCount++;
          return {
            ...workflow,
            isActive: false,
            updatedAt: new Date()
          };
        }
        return workflow;
      });

      if (resetCount > 0) {
        saveWorkflows(updatedWorkflows);
        console.log(`✅ CronService: Successfully reset ${resetCount} cron tasks`);
      } else {
        console.log('ℹ️ CronService: No active cron tasks to reset');
      }
    } else {
      console.log('ℹ️ CronService: Skipping cron reset (not first server start)');
    }

  } catch (error) {
    console.error('❌ CronService: Error resetting cron tasks:', error);
  }
}

export function startCronScheduler() {
  console.log('🔄 CronService: Starting cron scheduler...');

  // Сбрасываем все cron задачи при запуске сервера (только при первом запуске)
  resetAllCronTasks();

  // Только проверяем дубликаты каждые 5 секунд
  cron.schedule('*/5 * * * * *', async () => {
    try {
      await checkAndStopDuplicateTasks();
    } catch (error) {
      console.error('Error checking duplicate tasks:', error);
    }
  });

  console.log('✅ CronService: Cron scheduler started');
  isFirstStart = false;
}

// updateCronTasks больше не нужна - cron задачи создаются только через API активации
export async function updateCronTasks() {
  console.log('ℹ️ CronService: updateCronTasks() is deprecated - cron tasks are managed via API only');
}

export function stopCronScheduler(): void {
  for (const [, task] of runningTasks) {
    task.stop();
  }

  runningTasks.clear();
}

export function getActiveCronTasks() {
  const tasks = [];
  for (const [workflowId] of runningTasks) {
    tasks.push({
      workflowId,
      isRunning: true, // Если задача в Map, значит она активна
      nextExecution: getNextExecutionTime(),
    });
  }
  return tasks;
}

export function createCronTask(workflow: Workflow): boolean {
  try {
    console.log(`🚀 CronService: Creating cron task for workflow ${workflow.id}`);
    console.log(`📋 CronService: Workflow details:`, {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      isActive: workflow.isActive
    });

    // Проверяем, есть ли уже активная задача для этого workflow
    const existingTask = runningTasks.get(workflow.id);
    if (existingTask) {
      console.log(`ℹ️ CronService: Task already exists for workflow ${workflow.id} - stopping old task first`);
      try {
        existingTask.stop();
        runningTasks.delete(workflow.id);
        console.log(`✅ CronService: Old task stopped for workflow ${workflow.id}`);
      } catch (stopError) {
        console.warn(`⚠️ CronService: Failed to stop old task for workflow ${workflow.id}:`, stopError);
      }
      // Продолжаем создавать новую задачу
    }

    const cronConfig = workflow.trigger.config as { schedule?: string; timezone?: string };
    const schedule = cronConfig.schedule;
    const timezone = cronConfig.timezone || 'Europe/Moscow';

    console.log(`📅 CronService: Workflow ${workflow.id} - schedule: "${schedule}", timezone: "${timezone}"`);

    if (!schedule) {
      console.warn(`⚠️ CronService: Workflow ${workflow.id} has cron trigger but no schedule`);
      return false;
    }

    let task;
    try {
      console.log(`🔧 CronService: Creating cron job with schedule: "${schedule}"`);
      task = cron.schedule(schedule, async (): Promise<void> => {
        console.log(`⏰ CRON TASK TRIGGERED for workflow ${workflow.id} at ${new Date().toISOString()}`);
        console.log(`📅 Schedule: "${schedule}", Workflow: ${workflow.name || workflow.id}`);

        try {
        console.log(`🔍 CronService: Checking running executions for workflow ${workflow.id}`);

        // Проверяем, не выполняется ли уже этот workflow
        const executions = loadExecutions();
        const runningExecutions = executions.filter((e: WorkflowExecution) =>
          e.workflowId === workflow.id &&
          (e.status === 'running' || (e.status === 'completed' && new Date(e.startedAt).getTime() > Date.now() - 30000)) // Не старше 30 секунд
        );

        console.log(`📊 CronService: Found ${runningExecutions.length} recent executions for workflow ${workflow.id}`);

        if (runningExecutions.length > 0) {
          console.log(`⏰ CronService: Skipping cron execution for ${workflow.id} - ${runningExecutions.length} executions still running or recently completed`);
          return;
        }

        console.log(`🚀 CronService: Starting workflow execution for ${workflow.id}`);

        // Выполняем workflow с интеграцией PQueue для отображения в статистике
        await executeWorkflowWithQueueTracking(workflow, timezone);

        console.log(`✅ CronService: Workflow execution completed for ${workflow.id}`);

      } catch (error) {
        console.error(`❌ CronService: Cron workflow ${workflow.id} execution failed:`, error);
      }
    }, {
      timezone: timezone
    });

    runningTasks.set(workflow.id, task);
    console.log(`✅ CronService: Cron task created successfully for workflow ${workflow.id}`);
    return true;

    } catch (cronError) {
      console.error(`💥 CronService: Failed to create cron job for workflow ${workflow.id} with schedule "${schedule}":`, cronError);
      console.error('💥 CronService: Error details:', (cronError as Error)?.message, (cronError as Error)?.stack);
      return false;
    }
  } catch (error) {
    console.error(`💥 CronService: Failed to create cron task for workflow ${workflow.id}:`, error);
    return false;
  }
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

function getNextExecutionTime(): Date | null {
  // node-cron не предоставляет прямой доступ к следующему времени выполнения
  // Возвращаем null, так как сложно получить эту информацию
  return null;
}

async function checkAndStopDuplicateTasks() {
  const executions = await getExecutions();

  // Группируем executions по workflowId
  const executionsByWorkflow = executions.reduce((acc, execution) => {
    if (!acc[execution.workflowId]) {
      acc[execution.workflowId] = [];
    }
    acc[execution.workflowId].push(execution);
    return acc;
  }, {} as Record<string, WorkflowExecution[]>);

  // Проверяем каждый workflow
  for (const [, workflowExecutions] of Object.entries(executionsByWorkflow)) {
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
                await updateExecutionInFile(execution);
              }
            }
  }
}

// Инициализируем cron scheduler при запуске
if (typeof window === 'undefined') { // Только на сервере
  startCronScheduler();
}
