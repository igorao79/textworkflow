import { NextApiRequest, NextApiResponse } from 'next';
import { getQueueStats } from '@/lib/queue';
import { getQueueState } from '@/lib/queue-visualization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API /queue/stats: Request received');
  try {
    console.log('API /queue/stats: Starting try block');
    // Получаем статистику Bull queue
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue stats timeout')), 3000);
    });

    let bullStats;
    try {
      const bullStatsPromise = getQueueStats();
      bullStats = await Promise.race([bullStatsPromise, timeoutPromise]);
      console.log('API /queue/stats: Bull stats:', bullStats);
    } catch (error) {
      console.log('API /queue/stats: Bull stats timeout, using fallback');
      bullStats = {
        waiting: 0,
        active: 0,
        completedCount: 0,
        failedCount: 0,
        paused: false,
        completed: 0,
        failed: 0,
        retries: 0,
        totalJobs: 0
      };
    }

    // Получаем статистику PQueue
    const pQueueState = getQueueState();
    console.log('API /queue/stats: PQueue state:', JSON.stringify(pQueueState.taskStats));

    // Получаем количество активных cron задач (импортируем из cronService)
    const { getActiveCronTasks } = await import('@/services/cronService');
    const activeCronTasks = getActiveCronTasks();

    // Подсчитываем cron задачи за последнюю минуту
    const oneMinuteAgo = Date.now() - 60000;
    const recentCronTasks = pQueueState.tasks.filter(task =>
      task.task.startsWith('Cron workflow:') &&
      task.endTime && task.endTime > oneMinuteAgo
    ).length;

    // Объединяем статистику
    const combinedStats = {
      // Bull статистика (копируем все поля)
      ...(bullStats || {}),
      // Переопределяем поля с PQueue статистикой
      active: ((bullStats as any)?.active || 0) + pQueueState.queueStats.pending + activeCronTasks.length,
      completedCount: ((bullStats as any)?.completedCount || 0) + pQueueState.taskStats.completed,
      failedCount: ((bullStats as any)?.failedCount || 0) + pQueueState.taskStats.failed,
      totalJobs: ((bullStats as any)?.totalJobs || 0) + pQueueState.tasks.length,
      // Дополнительные поля
      pQueueActive: pQueueState.queueStats.pending,
      pQueueCompleted: pQueueState.taskStats.completed,
      pQueueFailed: pQueueState.taskStats.failed,
      activeCronTasks: activeCronTasks.length,
      recentCronTasks,
    };

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

