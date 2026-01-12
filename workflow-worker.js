const Queue = require('bull');
const cron = require('node-cron');
const fetch = require('node-fetch');

// Redis URL для Bull Queue
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Для тестирования без Redis - используем локальную память
const useRedis = process.env.USE_REDIS !== 'false';

// Next.js API URL
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';

// Создаем очередь (такая же как в lib/queue.ts)
// Для тестирования без Redis используем mock
let workflowQueue;
try {
  const Queue = require('bull');
  workflowQueue = new Queue('workflow-execution', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
  console.log('✅ Bull Queue initialized with Redis');
} catch (error) {
  console.log('⚠️ Redis not available, using mock queue for testing');
  // Mock queue для тестирования без Redis
  workflowQueue = {
    add: async (data) => {
      console.log('📝 Mock queue: added job', data);
      return { id: Date.now() };
    },
    process: (handler) => {
      console.log('📝 Mock queue: process handler registered');
    },
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
    close: async () => console.log('📝 Mock queue: closed')
  };
}

console.log('🚀 Workflow Worker started with PID:', process.pid);

// Обработчик задач из очереди
workflowQueue.process(async (job) => {
  const { workflowId, triggerData } = job.data;

  console.log(`🔥 Processing workflow job: ${workflowId} (job ${job.id})`);

  try {
    // Выполняем workflow через HTTP API (чтобы не импортировать внутренние модули)
    const response = await fetch(`${NEXTJS_URL}/api/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggerData })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Workflow ${workflowId} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Workflow ${workflowId} execution failed:`, error);
    throw error;
  }
});

// События очереди для логирования
workflowQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

workflowQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed permanently after ${job.attemptsMade} attempts:`, err.message);
});

workflowQueue.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});

// Функция для запуска cron задач
async function startCronScheduler() {
  console.log('⏰ Starting cron scheduler...');

  const fs = require('fs');
  const path = require('path');
  const CRON_TASKS_FILE = path.join(process.cwd(), 'data', 'cron-tasks.json');

  try {
    if (fs.existsSync(CRON_TASKS_FILE)) {
      const data = fs.readFileSync(CRON_TASKS_FILE, 'utf8');
      const savedWorkflowIds = JSON.parse(data);

      console.log('📋 Restoring cron tasks:', savedWorkflowIds);

      for (const workflowId of savedWorkflowIds) {
        try {
          // Получаем информацию о workflow через HTTP API
          console.log(`🔍 Fetching workflow ${workflowId}...`);
          const response = await fetch(`${NEXTJS_URL}/api/workflows/${workflowId}`);
          if (!response.ok) {
            console.log(`⚠️ Workflow ${workflowId} not found (HTTP ${response.status}), skipping`);
            continue;
          }

          const workflow = await response.json();
          console.log(`✅ Got workflow ${workflowId}:`, workflow.name);

          if (!workflow || !workflow.isActive || workflow.trigger.type !== 'cron') {
            console.log(`⚠️ Skipping invalid cron task for workflow: ${workflowId} (active: ${workflow?.isActive}, trigger: ${workflow?.trigger?.type})`);
            continue;
          }

          const cronConfig = workflow.trigger.config;
          const schedule = cronConfig.schedule;

          if (!schedule) {
            console.log(`⚠️ No schedule for workflow: ${workflowId}`);
            continue;
          }

          console.log(`🚀 Creating cron task for workflow: ${workflowId}, schedule: ${schedule}`);

              const cronTask = cron.schedule(schedule, async () => {
                console.log(`⏰ CRON TRIGGERED for workflow ${workflowId} at ${new Date().toISOString()}`);

                try {
                  // Добавляем задачу напрямую в Bull очередь
                  await workflowQueue.add({
                    workflowId: workflowId,
                    triggerData: {
                      trigger: 'cron',
                      timestamp: new Date().toISOString(),
                      timezone: cronConfig.timezone || 'Europe/Moscow'
                    }
                  });

                  console.log(`✅ Added workflow ${workflowId} to Bull queue from cron`);
                } catch (error) {
                  console.error(`💥 Failed to add workflow ${workflowId} to Bull queue from cron:`, error);
                }
              });

          console.log(`✅ Cron task created for workflow: ${workflowId}`);
        } catch (error) {
          console.error(`💥 Error creating cron task for ${workflowId}:`, error);
        }
      }
    } else {
      console.log('📋 No saved cron tasks found');
    }
  } catch (error) {
    console.error('💥 Error restoring cron tasks:', error);
  }

  console.log('✅ Cron scheduler started');
}

// Запускаем cron scheduler
(async () => {
  await startCronScheduler();
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');

  await workflowQueue.close();
  console.log('✅ Worker shut down');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');

  await workflowQueue.close();
  console.log('✅ Worker shut down');
  process.exit(0);
});

console.log('🎯 Workflow Worker is ready and listening for jobs...');
