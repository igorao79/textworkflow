import Queue from 'bull';
import { Worker } from 'worker_threads';
import { WorkflowExecution } from '../types/workflow';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Очередь для выполнения workflow
export const workflowQueue = new Queue('workflow-execution', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100, // Хранить последние 100 завершенных задач
    removeOnFail: 200,     // Хранить последние 200 неудачных задач
    attempts: 5,           // Максимум 5 попыток
    backoff: {
      type: 'exponential',
      delay: 2000,         // Начальная задержка 2 секунды
    },
  },
});

// Статистика очереди
export const queueStats = {
  completed: 0,
  failed: 0,
  retries: 0,
  paused: false,
};

// Обработчик задач workflow с изоляцией
workflowQueue.process(async (job) => {
  const { workflowId, triggerData } = job.data;

  return new Promise<WorkflowExecution>((resolve, reject) => {
    console.log(`🔒 Starting isolated workflow execution: ${workflowId} in job ${job.id}`);

    // Запускаем воркер в отдельном потоке для изоляции

    const worker = new Worker('./src/workers/workflow-worker.ts', {
      workerData: { workflowId, triggerData }
    });

    // Устанавливаем таймаут для воркера (максимум 5 минут)
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Workflow execution timeout for ${workflowId}`));
    }, 5 * 60 * 1000); // 5 минут

    worker.on('message', (message: { success: boolean; result?: WorkflowExecution; error?: string }) => {
      clearTimeout(timeout);

      if (message.success) {
        console.log(`✅ Isolated workflow completed: ${workflowId}`);
        // Обновляем статистику
        queueStats.completed++;
        resolve(message.result!); // result должен быть определен при success = true
      } else {
        console.error(`❌ Isolated workflow failed: ${workflowId}`, message.error);
        // Обновляем статистику
        queueStats.failed++;
        queueStats.retries++;
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error: Error) => {
      clearTimeout(timeout);
      console.error(`💥 Worker error for ${workflowId}:`, error);
      queueStats.failed++;
      reject(error);
    });

    worker.on('exit', (code: number) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error(`🚨 Worker exited with code ${code} for ${workflowId}`);
        queueStats.failed++;
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
});


// События очереди
workflowQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

workflowQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed permanently after ${job.attemptsMade} attempts:`, err.message);
  queueStats.failed++;
});

workflowQueue.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});

// Функции управления очередью
export const pauseQueue = async () => {
  await workflowQueue.pause();
  queueStats.paused = true;
  console.log('⏸️ Queue paused');
};

export const resumeQueue = async () => {
  await workflowQueue.resume();
  queueStats.paused = false;
  console.log('▶️ Queue resumed');
};

export const getQueueStats = async () => {
  const waiting = await workflowQueue.getWaiting();
  const active = await workflowQueue.getActive();
  const completed = await workflowQueue.getCompleted();
  const failed = await workflowQueue.getFailed();

  return {
    ...queueStats,
    waiting: waiting.length,
    active: active.length,
    completedCount: completed.length,
    failedCount: failed.length,
    totalJobs: waiting.length + active.length + completed.length + failed.length,
  };
};

// Экспорт для API
export default workflowQueue;
