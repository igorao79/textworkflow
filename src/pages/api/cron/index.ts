import { NextApiRequest, NextApiResponse } from 'next';
import { getActiveCronTasks, stopCronTask } from '@/services/cronService';

/**
 * @swagger
 * /api/cron:
 *   get:
 *     summary: Получить список активных cron задач
 *     responses:
 *       200:
 *         description: Список активных cron задач
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   workflowId:
 *                     type: string
 *                   isRunning:
 *                     type: boolean
 *                   nextExecution:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *   delete:
 *     summary: Остановить cron задачу
 *     parameters:
 *       - in: query
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cron задача остановлена
 *       404:
 *         description: Cron задача не найдена
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const tasks = getActiveCronTasks();
        res.status(200).json(tasks);
        break;

      case 'DELETE':
        const { workflowId } = req.query;
        if (workflowId === 'all') {
          // Останавливаем все cron задачи
          const tasks = getActiveCronTasks();
          let stoppedCount = 0;
          for (const task of tasks) {
            if (stopCronTask(task.workflowId)) {
              stoppedCount++;
            }
          }
          res.status(200).json({ message: `Stopped ${stoppedCount} cron tasks` });
        } else if (workflowId && typeof workflowId === 'string') {
          const stopped = stopCronTask(workflowId);
          if (stopped) {
            res.status(200).json({ message: `Cron task for workflow ${workflowId} stopped` });
          } else {
            res.status(404).json({ error: `Cron task for workflow ${workflowId} not found` });
          }
        } else {
          return res.status(400).json({ error: 'Missing workflowId parameter' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Cron API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
