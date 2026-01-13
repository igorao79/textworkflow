import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📡 API /queue/state called');

    // Получаем данные через API /api/queue/stats (как в queue-visualization.ts)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/queue/stats`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const stats = await response.json();
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
