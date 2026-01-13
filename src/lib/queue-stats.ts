// Queue stats utility for serverless functions
// This avoids circular dependencies and allows internal API calls

import { Redis } from '@upstash/redis';

export async function getQueueStats() {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis environment variables not configured');
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Получаем статистику из Redis
    const [
      waiting,
      active,
      completed,
      failed
    ] = await Promise.all([
      redis.llen('queue:waiting'),
      redis.llen('queue:active'),
      redis.llen('queue:completed'),
      redis.llen('queue:failed')
    ]);

    return {
      waiting,
      active,
      completedCount: completed,
      failedCount: failed,
      paused: false, // Не отслеживаем паузу в текущей реализации
      completed,
      failed,
      retries: 0, // Не отслеживаем в текущей реализации
      totalJobs: waiting + active + completed + failed,
      pQueueActive: active,
      pQueueCompleted: 0,
      pQueueFailed: 0,
      activeCronTasks: 0,
      dbCompleted: completed,
      dbFailed: failed,
      dbRunning: active
    };
  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    throw error;
  }
}
