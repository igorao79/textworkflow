import { NextApiRequest, NextApiResponse } from 'next';
import { updateCronTasks } from '@/services/cronService';

/**
 * @swagger
 * /api/cron/activate:
 *   post:
 *     summary: Активировать cron задачу для workflow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workflowId:
 *                 type: string
 *                 description: ID workflow для активации cron задачи
 *     responses:
 *       200:
 *         description: Cron задача активирована
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Workflow не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔥 API /cron/activate: Request received');
  console.log('📋 API /cron/activate: Request body:', req.body);

  try {
    if (req.method !== 'POST') {
      console.log('❌ API /cron/activate: Wrong method:', req.method);
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { workflowId } = req.body;

    if (!workflowId || typeof workflowId !== 'string') {
      console.log('❌ API /cron/activate: Invalid workflowId:', workflowId);
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    console.log('🚀 API /cron/activate: Calling updateCronTasks()');

    // Останавливаем существующие задачи для этого workflow перед активацией новых
    const { stopCronTask } = await import('@/services/cronService');
    stopCronTask(workflowId);

    // Вызываем updateCronTasks для активации cron задач
    await updateCronTasks();

    console.log(`✅ API /cron/activate: Cron task activated successfully for workflow ${workflowId}`);

    res.status(200).json({
      message: 'Cron task activated successfully',
      workflowId
    });

  } catch (error) {
    console.error('💥 API /cron/activate: Exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
