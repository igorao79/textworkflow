import * as cron from 'node-cron';
import { executeWorkflow, getWorkflows, updateWorkflow, saveExecutionResult, getExecutions } from './workflowService';
import { WorkflowExecution, Workflow } from '../types/workflow';

// Все данные загружаются через API из внешних сервисов

async function updateExecutionInFile(updatedExecution: WorkflowExecution): Promise<void> {
  try {
    // Используем saveExecutionResult вместо прямого обновления
    await saveExecutionResult(updatedExecution);
  } catch (error) {
    console.error('Error updating execution in file:', error);
  }
}

const runningTasks = new Map<string, cron.ScheduledTask>();
let isFirstStart = true;

// Функция для выполнения cron workflow
async function executeWorkflowWithQueueTracking(workflow: Workflow, timezone: string): Promise<void> {
  console.log(`🔄 EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING START for workflow ${workflow.id} at ${new Date().toISOString()}`);

  await executeWorkflow(workflow.id, {
    trigger: 'cron' as const,
    timestamp: new Date().toISOString(),
    timezone: timezone
  });

  console.log(`✅ EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING COMPLETE for workflow ${workflow.id}`);
}

async function resetAllCronTasks(): Promise<void> {
  console.log('🔄 CronService: Resetting all cron tasks on server startup...');

  try {
    // Деактивируем все cron workflow ТОЛЬКО при первом запуске сервера
    if (isFirstStart) {
      const workflows = await getWorkflows();
      let resetCount = 0;

      // Деактивируем cron воркфлоу индивидуально
      for (const workflow of workflows) {
        if (workflow.trigger.type === 'cron' && workflow.isActive) {
          console.log(`🔄 CronService: Deactivating cron workflow: ${workflow.name} (${workflow.id})`);
          try {
            await updateWorkflow(workflow.id, { isActive: false });
            resetCount++;
          } catch (updateError) {
            console.error(`❌ Failed to deactivate workflow ${workflow.id}:`, updateError);
          }
        }
      }

      if (resetCount > 0) {
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

export async function startCronScheduler() {
  console.log('🔄 CronService: Starting cron scheduler...');

  // Сбрасываем все cron задачи при запуске сервера (только при первом запуске)
  await resetAllCronTasks();

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
    let schedule = cronConfig.schedule;
    const timezone = cronConfig.timezone || 'Europe/Moscow';

    console.log(`📅 CronService: Workflow ${workflow.id} - raw schedule: "${schedule}", timezone: "${timezone}"`);
    console.log(`📅 CronService: Raw trigger config:`, JSON.stringify(workflow.trigger.config, null, 2));

    if (!schedule) {
      console.warn(`⚠️ CronService: Workflow ${workflow.id} has cron trigger but no schedule`);
      return false;
    }

    if (typeof schedule !== 'string') {
      console.warn(`⚠️ CronService: Workflow ${workflow.id} schedule is not a string:`, typeof schedule, schedule);
      return false;
    }

    if (schedule.trim() === '') {
      console.warn(`⚠️ CronService: Workflow ${workflow.id} schedule is empty`);
      return false;
    }

    // Конвертируем специальный формат в cron выражение
    schedule = schedule.trim();
    if (schedule === '1') {
      schedule = '* * * * *'; // каждая минута
      console.log(`🔄 CronService: Converted special format "1" to cron expression "* * * * *"`);
    } else if (schedule === '11') {
      schedule = '0 * * * *'; // каждый час
      console.log(`🔄 CronService: Converted special format "11" to cron expression "0 * * * *"`);
    } else if (schedule === '111') {
      schedule = '0 0 * * *'; // каждый день в полночь
      console.log(`🔄 CronService: Converted special format "111" to cron expression "0 0 * * *"`);
    } else if (schedule === '1111') {
      schedule = '0 0 * * 1'; // каждый понедельник
      console.log(`🔄 CronService: Converted special format "1111" to cron expression "0 0 * * 1"`);
    }

    console.log(`📅 CronService: Final schedule: "${schedule}"`);

    let task;
    try {
      console.log(`🔧 CronService: Creating cron job with schedule: "${schedule}" and timezone: "${timezone}"`);
      console.log(`🔧 CronService: Validating cron schedule before creating job...`);

      // Проверяем валидность cron выражения
      let scheduleToValidate = schedule;
      const hasSeconds = schedule.split(' ').length === 6;
      if (hasSeconds) {
        scheduleToValidate = schedule.split(' ').slice(1).join(' ');
      }

      if (!cron.validate(scheduleToValidate)) {
        console.error(`❌ CronService: Invalid cron schedule: "${schedule}" (validated as: "${scheduleToValidate}")`);
        return false;
      }

      console.log(`✅ CronService: Cron schedule "${schedule}" is valid`);

      // Проверяем, является ли это 6-полевым выражением (с секундами)
      const isSixFieldCron = schedule.split(' ').length === 6;
      if (isSixFieldCron) {
        console.log(`🔧 CronService: Detected 6-field cron expression, converting to 5-field`);
        // Убираем первое поле (секунды) для node-cron
        const fiveFieldSchedule = schedule.split(' ').slice(1).join(' ');
        console.log(`🔧 CronService: Converted "${schedule}" to "${fiveFieldSchedule}"`);
        schedule = fiveFieldSchedule;
      }

      task = cron.schedule(schedule, async (): Promise<void> => {
        console.log(`⏰ CRON TASK TRIGGERED for workflow ${workflow.id} at ${new Date().toISOString()}`);
        console.log(`📅 Schedule: "${schedule}", Workflow: ${workflow.name || workflow.id}`);

        try {
        console.log(`🔍 CronService: Checking running executions for workflow ${workflow.id}`);

        // Проверяем, не выполняется ли уже этот workflow
        const executions = await getExecutions();
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
  const executionsByWorkflow = executions.reduce((acc: Record<string, WorkflowExecution[]>, execution: WorkflowExecution) => {
    if (!acc[execution.workflowId]) {
      acc[execution.workflowId] = [];
    }
    acc[execution.workflowId].push(execution);
    return acc;
  }, {} as Record<string, WorkflowExecution[]>);

  // Проверяем каждый workflow
  for (const [, workflowExecutions] of Object.entries(executionsByWorkflow)) {
    const runningExecutions = (workflowExecutions as WorkflowExecution[]).filter((e: WorkflowExecution) => e.status === 'running');

            if (runningExecutions.length > 1) {
              // Оставляем только самую свежую execution, остальные помечаем как failed
              const sortedExecutions = runningExecutions.sort((a: WorkflowExecution, b: WorkflowExecution) =>
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
  startCronScheduler().catch(error => {
    console.error('❌ Failed to start cron scheduler:', error);
  });
}
