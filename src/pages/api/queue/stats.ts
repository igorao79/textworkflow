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
      task.endTime && task.endTime.getTime() > oneMinuteAgo
    ).length;

    // Объединяем статистику
    const combinedStats = {
      ...bullStats,
      // Добавляем PQueue статистику + активные cron задачи
      active: bullStats.active + pQueueState.queueStats.pending + activeCronTasks.length, // выполняющиеся + активные cron
      waiting: bullStats.waiting, // ожидающие остаются от Bull
      completedCount: bullStats.completedCount + pQueueState.taskStats.completed, // завершенные из Bull + завершенные из PQueue
      failedCount: bullStats.failedCount + pQueueState.taskStats.failed, // ошибки из Bull + ошибки из PQueue
      totalJobs: bullStats.totalJobs + pQueueState.tasks.length, // общее количество задач
      pQueueActive: pQueueState.queueStats.pending, // активные задачи PQueue
      pQueueCompleted: pQueueState.taskStats.completed, // завершенные задачи PQueue
      pQueueFailed: pQueueState.taskStats.failed, // ошибки PQueue
      cronTasksLastMinute: recentCronTasks, // cron задачи за последнюю минуту
      activeCronTasks: activeCronTasks.length, // количество активных cron задач
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

