import { NextApiRequest, NextApiResponse } from 'next';
import { getQueueStats } from '@/lib/queue';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 API /queue/stats: Getting queue statistics');

    // Проверим cron задачи отдельно - загружаем из файла, а не из памяти
    console.log('🔍 API /queue/stats: Checking cron tasks from file...');
    const CRON_TASKS_FILE = path.join(process.cwd(), 'data', 'cron-tasks.json');

    let cronTasks = [];
    try {
      if (fs.existsSync(CRON_TASKS_FILE)) {
        const data = fs.readFileSync(CRON_TASKS_FILE, 'utf8');
        const savedWorkflowIds = JSON.parse(data);
        cronTasks = savedWorkflowIds.map((id: string) => ({ workflowId: id, isRunning: true, nextExecution: null }));
        console.log('📊 API /queue/stats: Loaded cron tasks from file:', cronTasks.length, cronTasks);
      } else {
        console.log('📊 API /queue/stats: No cron tasks file found');
      }
    } catch (error) {
      console.error('❌ API /queue/stats: Error loading cron tasks from file:', error);
    }

    // Проверим подключение к Redis/Bull
    console.log('🔍 API /queue/stats: Checking Redis connection...');

    // Устанавливаем таймаут для запроса к queue stats
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue stats timeout')), 3000);
    });

    const statsPromise = getQueueStats();

    const stats = await Promise.race([statsPromise, timeoutPromise]);
    console.log('✅ API /queue/stats: Returning stats:', stats);
    res.status(200).json(stats);
  } catch (error) {
    console.error('💥 API /queue/stats: Error getting queue stats:', error);
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

