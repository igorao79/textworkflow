import fs from 'fs';
import path from 'path';

// Bull Queue с fallback на mock
let Queue;
try {
  Queue = require('bull');
} catch (error) {
  console.log('⚠️ Bull not available, will use mock');
  Queue = null;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Fallback для случаев когда Redis недоступен
const mockQueueStats = {
  waiting: 0,
  active: 0,
  completedCount: 0,
  failedCount: 0,
  paused: false,
  completed: 0,
  failed: 0,
  retries: 0,
  totalJobs: 0,
};

// Очередь для выполнения workflow
let workflowQueue;
try {
  workflowQueue = new Queue('workflow-execution', REDIS_URL, {
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
  console.log('✅ Bull Queue initialized with Redis');
} catch (error) {
  console.log('⚠️ Redis not available, using mock queue');
  // Mock queue для тестирования
  workflowQueue = {
    add: async (data) => {
      console.log('📝 Mock queue: added job', data);
      return { id: Date.now() };
    },
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
    close: async () => console.log('📝 Mock queue: closed')
  };
}

export { workflowQueue };

// Статистика очереди
export const queueStats = {
  completed: 0,
  failed: 0,
  retries: 0,
  paused: false,
};

// ВНИМАНИЕ: Обработчик задач workflow должен запускаться в ОТДЕЛЬНОМ worker процессе
// НЕ в Next.js API routes!
//
// Правильная архитектура:
// 1. Next.js API routes - только добавляют задачи (queue.add)
// 2. Отдельный Node.js процесс - обрабатывает задачи (queue.process)
// 3. Cron scheduler тоже в отдельном процессе
//
// См. src/workers/workflow-worker.ts для правильной реализации

// Убрал workflowQueue.process() отсюда - он должен быть в отдельном worker процессе


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
  try {
    await workflowQueue.pause();
    queueStats.paused = true;
    console.log('⏸️ Queue paused');
  } catch (error) {
    console.warn('Failed to pause queue (Redis unavailable):', error);
    // Имитируем паузу локально
    queueStats.paused = true;
  }
};

export const resumeQueue = async () => {
  try {
    await workflowQueue.resume();
    queueStats.paused = false;
    console.log('▶️ Queue resumed');
  } catch (error) {
    console.warn('Failed to resume queue (Redis unavailable):', error);
    // Имитируем возобновление локально
    queueStats.paused = false;
  }
};

export const getQueueStats = async () => {
  try {
    console.log('🔍 getQueueStats: Getting queue statistics...');
    const waiting = await workflowQueue.getWaitingCount();
    const active = await workflowQueue.getActiveCount();
    const completed = await workflowQueue.getCompletedCount();
    const failed = await workflowQueue.getFailedCount();

    console.log('📊 Raw queue stats - waiting:', waiting, 'active:', active, 'completed:', completed, 'failed:', failed);

    // Загружаем cron задачи из файла (синхронизация между процессами)
    const CRON_TASKS_FILE = path.join(process.cwd(), 'data', 'cron-tasks.json');

    let cronTasks = [];
    try {
      if (fs.existsSync(CRON_TASKS_FILE)) {
        const data = fs.readFileSync(CRON_TASKS_FILE, 'utf8');
        const savedWorkflowIds = JSON.parse(data);
        cronTasks = savedWorkflowIds.map((id: string) => ({ workflowId: id, isRunning: true, nextExecution: null }));
      }
    } catch (error) {
      console.warn('Error loading cron tasks from file:', error);
    }

    console.log('📊 Cron tasks loaded from file:', cronTasks.length, cronTasks);

    const stats = {
      ...queueStats,
      waiting: waiting,
      active: active + cronTasks.length, // Добавляем cron задачи как активные
      completedCount: completed,
      failedCount: failed,
      totalJobs: waiting + active + completed + failed + cronTasks.length,
      cronTasks: cronTasks.length, // Добавляем отдельную статистику по cron
    };

    console.log('📊 Final queue stats:', stats);
    return stats;
  } catch (error) {
    console.warn('Redis/Bull queue unavailable, using mock stats:', error);
    // Возвращаем mock данные если Redis недоступен
    return mockQueueStats;
  }
};

// Экспорт для API
export default workflowQueue;
