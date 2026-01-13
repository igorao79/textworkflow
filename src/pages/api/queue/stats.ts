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

    // Получаем статистику executions из базы данных
    const { getExecutions } = await import('@/services/workflowService');
    const allExecutions = await getExecutions();

    const executionStats = allExecutions.reduce((acc, exec) => {
      if (exec.status === 'completed') acc.completed++;
      else if (exec.status === 'failed') acc.failed++;
      else if (exec.status === 'running') acc.running++;
      return acc;
    }, { completed: 0, failed: 0, running: 0 });

    // Формируем ответ в старом формате для совместимости
    const combinedStats = {
      waiting: waiting,
      active: active + activeCronTasks.length + executionStats.running,
      completedCount: completed + executionStats.completed,
      failedCount: failed + executionStats.failed,
      paused: false,
      completed: completed + executionStats.completed,
      failed: failed + executionStats.failed,
      retries: 0,
      totalJobs: waiting + active + completed + failed,
      pQueueActive: active,
      pQueueCompleted: completed,
      pQueueFailed: failed,
      activeCronTasks: activeCronTasks.length,
      dbCompleted: executionStats.completed,
      dbFailed: executionStats.failed,
      dbRunning: executionStats.running,
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

