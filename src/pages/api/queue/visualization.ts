import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем Upstash переменные (важная диагностика)
  console.log('📡 API /queue/visualization called');
  console.log('🔧 REDIS URL exists:', !!process.env.UPSTASH_REDIS_REST_URL);
  console.log('🔧 REDIS TOKEN exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN);

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

    const result = {
      tasks: [], // Пока пустой массив задач
      queueStats: {
        size: waiting + active,
        pending: active,
        concurrency: 1,
        isPaused: false, // Redis очередь не имеет состояния paused
        timeout: 300000
      },
      taskStats: {
        pending: waiting,
        running: active,
        completed: completed,
        failed: failed,
        total: waiting + active + completed + failed
      }
    };

    console.log('📊 API /queue/visualization returning:', {
      waiting, active, completed, failed, total: waiting + active + completed + failed
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in /api/queue/visualization:', error);

    // Fallback response
    res.status(200).json({
      tasks: [],
      queueStats: {
        size: 0,
        pending: 0,
        concurrency: 1,
        isPaused: false,
        timeout: 300000
      },
      taskStats: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        total: 0
      }
    });
  }
}
