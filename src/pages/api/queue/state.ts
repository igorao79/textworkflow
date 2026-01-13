import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📡 API /queue/state called');

    // Получаем данные через внутренний импорт (избегаем NEXT_PUBLIC_ переменных в serverless)
    const { getQueueStats } = await import('@/lib/queue-stats');
    const stats = await getQueueStats();
    console.log('📊 API /queue/state received stats:', stats);

    // Преобразуем в формат, ожидаемый компонентом
    const result = {
      tasks: [], // Пустой массив задач для совместимости
      queueStats: {
        size: stats.waiting + stats.active,
        pending: stats.waiting,
        concurrency: 5, // Фиксированное значение
        isPaused: stats.paused,
        timeout: 300000 // 5 минут
      },
      taskStats: {
        pending: stats.waiting,
        running: stats.active,
        completed: stats.completedCount,
        failed: stats.failedCount,
        total: stats.totalJobs
      }
    };

    console.log('📊 API /queue/state returning:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in /api/queue/state:', error);
    res.status(500).json({
      error: 'Failed to get queue state',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
