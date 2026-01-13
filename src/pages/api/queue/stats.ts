import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API /queue/stats: Request received');
  try {
    // Простая Redis-очередь без BullMQ
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Получаем длину очередей
    const [waiting, active, completed, failed] = await Promise.all([
      redis.llen('queue:waiting'),
      redis.llen('queue:active'),
      redis.llen('queue:completed'),
      redis.llen('queue:failed')
    ]);

    // Получаем количество активных cron задач
    const { getActiveCronTasks } = await import('@/services/cronService');
    const activeCronTasks = getActiveCronTasks();

    // Формируем ответ в старом формате для совместимости
    const combinedStats = {
      waiting: waiting,
      active: active + activeCronTasks.length,
      completedCount: completed,
      failedCount: failed,
      paused: false,
      completed: completed,
      failed: failed,
      retries: 0,
      totalJobs: waiting + active + completed + failed,
      pQueueActive: active,
      pQueueCompleted: completed,
      pQueueFailed: failed,
      activeCronTasks: activeCronTasks.length,
      recentCronTasks: 0, // Пока не считаем
    };

    console.log('API /queue/stats: Returning stats:', combinedStats);
    res.status(200).json(combinedStats);
  } catch (error) {
    console.error('Error getting queue stats:', error);
    // Возвращаем fallback данные вместо ошибки
    res.status(200).json({
      waiting: 0,
      active: 0,
      completedCount: 0,
      failedCount: 0,
      paused: false,
      completed: 0,
      failed: 0,
      retries: 0,
      totalJobs: 0,
      pQueueActive: 0,
      pQueueCompleted: 0,
      pQueueFailed: 0,
      cronTasksLastMinute: 0,
      activeCronTasks: 0
    });
  }
}

