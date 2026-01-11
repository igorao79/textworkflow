import { NextApiRequest, NextApiResponse } from 'next';
import { getQueueStats } from '@/lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Устанавливаем таймаут для запроса к queue stats
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue stats timeout')), 3000);
    });

    const statsPromise = getQueueStats();

    const stats = await Promise.race([statsPromise, timeoutPromise]);
    res.status(200).json(stats);
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
      totalJobs: 0
    });
  }
}

