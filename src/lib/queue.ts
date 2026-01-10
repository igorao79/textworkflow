import Queue from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Очередь для выполнения workflow
export const workflowQueue = new Queue('workflow-execution', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 50, // Хранить последние 50 завершенных задач
    removeOnFail: 100,    // Хранить последние 100 неудачных задач
    attempts: 3,          // Максимум 3 попытки
    backoff: {
      type: 'exponential',
      delay: 5000,        // Задержка между попытками
    },
  },
});

// Обработчик задач workflow
workflowQueue.process(async (job) => {
  const { workflowId, triggerData } = job.data;

  try {
    // Здесь будет логика выполнения workflow
    // Импорт сервиса workflow для выполнения
    const { executeWorkflow } = await import('@/services/workflowService');
    const result = await executeWorkflow(workflowId, triggerData);

    return result;
  } catch (error) {
    console.error(`Workflow ${workflowId} execution failed:`, error);
    throw error;
  }
});

// События очереди
workflowQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

export default workflowQueue;
