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
const taskCreationLocks = new Set<string>(); // Защита от одновременного создания задач
let isFirstStart = true;

// Функция для выполнения cron workflow
async function executeWorkflowWithQueueTracking(workflow: Workflow, timezone: string): Promise<void> {
  const executionStart = new Date().toISOString();
  console.log(`🔄 EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING START for workflow ${workflow.id} at ${executionStart}`);

  try {
    // Workflow уже проверен на isActive в cron callback, просто выполняем
    console.log(`✅ Workflow ${workflow.id} passed all checks, executing...`);

    await executeWorkflow(workflow.id, {
      trigger: 'cron' as const,
      timestamp: executionStart,
      timezone: timezone
    });

    const executionEnd = new Date().toISOString();
    console.log(`✅ EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING COMPLETE for workflow ${workflow.id} at ${executionEnd}`);
    console.log(`⏱️ Total execution time: ${new Date(executionEnd).getTime() - new Date(executionStart).getTime()}ms`);
  } catch (error) {
    console.error(`❌ EXECUTE_WORKFLOW_WITH_QUEUE_TRACKING FAILED for workflow ${workflow.id}:`, error);
    throw error;
  }
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
  console.log('🔧 Environment:', process.env.NODE_ENV);
  console.log('🔧 isFirstStart:', isFirstStart);
  console.log('🔧 Current running tasks:', runningTasks.size);

  // В dev режиме всегда сбрасываем cron задачи при запуске (из-за hot reload)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev || isFirstStart) {
    console.log('🔄 CronService: Resetting all cron tasks (dev mode or first start)');
    await resetAllCronTasks();
  }

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

export async function stopCronScheduler(): Promise<void> {
  console.log('🛑 Stopping all cron tasks...');
  console.log(`📋 Tasks to stop: ${runningTasks.size}`);

  // Останавливаем все активные задачи
  for (const [workflowId, task] of runningTasks) {
    try {
      task.stop();
      console.log(`✅ Cron task stopped for workflow: ${workflowId}`);
    } catch (error) {
      console.error(`❌ Error stopping cron task for ${workflowId}:`, error);
    }
  }

  // Очищаем Map с задачами и блокировки
  runningTasks.clear();
  taskCreationLocks.clear();
  console.log('🧹 All cron tasks cleared from memory');

  // Деактивируем все cron workflows в базе данных
  try {
    const { getWorkflows, updateWorkflow } = await import('./workflowService');
    const workflows = await getWorkflows();
    let deactivatedCount = 0;

    for (const workflow of workflows) {
      if (workflow.trigger.type === 'cron' && workflow.isActive) {
        try {
          await updateWorkflow(workflow.id, { isActive: false });
          deactivatedCount++;
          console.log(`✅ Deactivated cron workflow: ${workflow.id}`);
        } catch (updateError) {
          console.error(`❌ Failed to deactivate workflow ${workflow.id}:`, updateError);
        }
      }
    }

    console.log(`✅ StopCronScheduler: Deactivated ${deactivatedCount} cron workflows`);
  } catch (error) {
    console.error('❌ Error deactivating cron workflows:', error);
  }

  console.log('✅ All cron tasks stopped and workflows deactivated');
}

export function getActiveCronTasks() {
  console.log(`📋 getActiveCronTasks called, current runningTasks size: ${runningTasks.size}`);
  console.log(`📋 Active workflow IDs:`, Array.from(runningTasks.keys()));

  const tasks = [];
  for (const [workflowId] of runningTasks) {
    tasks.push({
      workflowId,
      isRunning: true, // Если задача в Map, значит она активна
      nextExecution: getNextExecutionTime(),
    });
  }

  console.log(`📋 Returning ${tasks.length} active cron tasks`);
  return tasks;
}

export function createCronTask(workflow: Workflow): boolean {
  try {
    console.log(`🚀 CronService: Creating cron task for workflow ${workflow.id}`);

    // Проверяем блокировку создания задачи
    if (taskCreationLocks.has(workflow.id)) {
      console.warn(`⚠️ CronService: Task creation already in progress for workflow ${workflow.id}`);
      return false;
    }

    // Устанавливаем блокировку
    taskCreationLocks.add(workflow.id);

    console.log(`📋 CronService: Current running tasks count: ${runningTasks.size}`);
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
        console.log(`✅ CronService: task.stop() called for existing task`);
      } catch (stopError) {
        console.warn(`⚠️ CronService: Failed to stop old task for workflow ${workflow.id}:`, stopError);
      }

      // Принудительно удаляем из всех коллекций
      runningTasks.delete(workflow.id);
      taskCreationLocks.delete(workflow.id);

      console.log(`✅ CronService: Old task cleaned up for workflow ${workflow.id}`);
      console.log(`📋 CronService: Running tasks after cleanup: ${runningTasks.size}`);
    } else {
      console.log(`ℹ️ CronService: No existing task found for workflow ${workflow.id}`);
    }

    const cronConfig = workflow.trigger.config as { schedule?: string; timezone?: string };
    let schedule = cronConfig.schedule;
    const timezone = cronConfig.timezone || 'Europe/Moscow';

    console.log(`📅 CronService: Workflow ${workflow.id} - raw schedule: "${schedule}", timezone: "${timezone}"`);
    console.log(`📅 CronService: Raw trigger config:`, JSON.stringify(workflow.trigger.config, null, 2));

    // Проверяем, является ли schedule числом (специальный формат)
    if (schedule === '1') {
      console.log(`🔄 CronService: Converting special format "1" to "* * * * *"`);
    } else if (schedule === '11') {
      console.log(`🔄 CronService: Converting special format "11" to "0 * * * *"`);
    } else if (schedule === '111') {
      console.log(`🔄 CronService: Converting special format "111" to "0 0 * * *"`);
    } else if (schedule === '1111') {
      console.log(`🔄 CronService: Converting special format "1111" to "0 0 * * 1"`);
    }

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
        const triggerTime = new Date().toISOString();
        console.log(`⏰ CRON TASK TRIGGERED for workflow ${workflow.id} at ${triggerTime}`);
        console.log(`📋 Current runningTasks state:`, Array.from(runningTasks.keys()));
        console.log(`🔧 Production check - environment: ${process.env.NODE_ENV}`);

        // Проверяем, что задача все еще активна (не была остановлена)
        if (!runningTasks.has(workflow.id)) {
          console.log(`⚠️ CRON TASK SKIPPED - workflow ${workflow.id} is no longer active (removed from runningTasks)`);
          return;
        }

        console.log(`✅ Workflow ${workflow.id} is still active, executing immediately`);

        try {
          console.log(`🚀 CronService: Starting workflow execution for ${workflow.id}`);

          // Выполняем workflow напрямую без дополнительных проверок
          await executeWorkflowWithQueueTracking(workflow, timezone);

          console.log(`✅ CronService: Workflow execution completed for ${workflow.id}`);

        } catch (error) {
          console.error(`❌ CronService: Cron workflow ${workflow.id} execution failed:`, error);
        }
    }, {
      timezone: timezone
    });

    // Проверяем, что задача не была добавлена ранее
    if (runningTasks.has(workflow.id)) {
      console.warn(`⚠️ CronService: Task already exists in runningTasks for workflow ${workflow.id} - this should not happen`);
      return false;
    }

    runningTasks.set(workflow.id, task);
    taskCreationLocks.delete(workflow.id); // Снимаем блокировку после успешного создания
    console.log(`✅ CronService: Cron task created and added to runningTasks for workflow ${workflow.id}`);
    console.log(`📋 CronService: Total running tasks after creation: ${runningTasks.size}`);
    console.log(`📅 Final schedule: ${schedule} (timezone: ${timezone})`);
    console.log(`🚀 Cron task scheduled successfully - waiting for next execution`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);

    // Логируем время следующего выполнения
    try {
      // node-cron не предоставляет прямой доступ к следующему времени,
      // но мы можем рассчитать примерное время
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000); // +1 минута
      console.log(`⏰ Approximate next execution: ${nextMinute.toISOString()} (${nextMinute.toLocaleString('ru-RU')})`);
    } catch {
      console.log('⏰ Could not calculate next execution time');
    }

    return true;

    } catch (cronError) {
      console.error(`💥 CronService: Failed to create cron job for workflow ${workflow.id} with schedule "${schedule}":`, cronError);
      console.error('💥 CronService: Error details:', (cronError as Error)?.message, (cronError as Error)?.stack);
      taskCreationLocks.delete(workflow.id); // Снимаем блокировку при ошибке
      return false;
    }
  } catch (error) {
    console.error(`💥 CronService: Failed to create cron task for workflow ${workflow.id}:`, error);
    taskCreationLocks.delete(workflow.id); // Снимаем блокировку при ошибке
    return false;
  }
}

export async function stopCronTask(workflowId: string, clearQueue: boolean = false): Promise<boolean> {
  console.log(`🛑 Stopping cron task for workflow: ${workflowId}`, clearQueue ? '(with queue cleanup)' : '(cron only)');
  console.log(`📋 Current running tasks before stop:`, Array.from(runningTasks.keys()));

  const task = runningTasks.get(workflowId);
  if (task) {
    try {
      console.log(`🔧 Calling task.stop() for workflow: ${workflowId}`);
      task.stop();
      console.log(`✅ task.stop() completed for workflow: ${workflowId}`);

      // Принудительно удаляем задачу из всех коллекций
      runningTasks.delete(workflowId);
      taskCreationLocks.delete(workflowId);

      // Дополнительная проверка - убеждаемся, что задача действительно удалена
      if (runningTasks.has(workflowId)) {
        console.warn(`⚠️ Task still exists in runningTasks after deletion for workflow: ${workflowId}`);
        runningTasks.delete(workflowId); // Повторная попытка удаления
      }

      console.log(`✅ Cron task removed from runningTasks for workflow: ${workflowId}`);
      console.log(`📋 Current running tasks after stop:`, Array.from(runningTasks.keys()));

      // Деактивируем workflow в базе данных ПЕРВЫМ ДЕЛОМ
      try {
        const { updateWorkflow } = await import('./workflowService');
        await updateWorkflow(workflowId, { isActive: false });
        console.log(`✅ Workflow deactivated in database: ${workflowId}`);
      } catch (updateError) {
        console.error(`❌ Failed to deactivate workflow ${workflowId}:`, updateError);
        return false;
      }

      // Очистка очереди (опционально, для полного стоп)
      if (clearQueue) {
        try {
          console.log(`🧹 Clearing queue jobs for workflow: ${workflowId}`);
          const { getQueueService } = await import('@/lib/queue-service');
          const queueService = getQueueService();

          // Получаем все активные задачи
          const activeJobs = await queueService.getActiveJobs();
          let clearedCount = 0;

          // Ищем и удаляем задачи для этого workflow
          for (const jobData of activeJobs) {
            try {
              const job = JSON.parse(jobData);
              if (job.workflowId === workflowId) {
                console.log(`🗑️ Removing active job ${job.id} for stopped workflow ${workflowId}`);
                await queueService.failJob(job.id, 'Workflow stopped by user');
                clearedCount++;
              }
            } catch (parseError) {
              console.error('❌ Error parsing active job data:', parseError);
            }
          }

          console.log(`✅ Cleared ${clearedCount} active jobs from queue for workflow ${workflowId}`);
        } catch (queueError) {
          console.error(`❌ Error clearing queue for workflow ${workflowId}:`, queueError);
          // Не возвращаем false, так как основная задача (остановка cron) выполнена
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Error stopping cron task for workflow ${workflowId}:`, error);
      taskCreationLocks.delete(workflowId); // Очищаем блокировку даже при ошибке
      return false;
    }
  }

  console.log(`ℹ️ No active cron task found for workflow: ${workflowId}, but will try to deactivate workflow in database`);

  // Даже если cron задача не найдена, пытаемся деактивировать workflow в базе данных
  // Это исправит несинхронизированное состояние
  try {
    const { updateWorkflow } = await import('./workflowService');
    await updateWorkflow(workflowId, { isActive: false });
    console.log(`✅ Workflow deactivated in database (fallback): ${workflowId}`);
    return true; // Возвращаем true, так как задача "успешно остановлена" с точки зрения UI
  } catch (updateError) {
    console.error(`❌ Failed to deactivate workflow ${workflowId} (fallback):`, updateError);
    return false;
  }
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
  console.log('🚀 Initializing cron scheduler on server startup...');

  // Добавляем небольшую задержку для гарантии инициализации
  setTimeout(() => {
    startCronScheduler().catch(error => {
      console.error('❌ Failed to start cron scheduler:', error);
    });
  }, 1000);
}
