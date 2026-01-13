import { NextApiRequest, NextApiResponse } from 'next';
import { getExecutions, getExecution } from '@/services/workflowService';

/**
 * @swagger
 * /api/executions:
 *   get:
 *     summary: Получить список выполнений workflow
 *     parameters:
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: Фильтр по ID workflow
 *     responses:
 *       200:
 *         description: Список выполнений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkflowExecution'
 *   post:
 *     summary: Запустить выполнение workflow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workflowId:
 *                 type: string
 *               triggerData:
 *                 type: object
 *                 description: Данные триггера
 *     responses:
 *       201:
 *         description: Выполнение добавлено в очередь
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 message:
 *                   type: string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`📡 ${req.method} /api/executions - Starting request`);
    switch (req.method) {
      case 'GET':
        const { workflowId: queryWorkflowId, includeLogs } = req.query;
        console.log('📡 /api/executions - Fetching executions...');
        const executions = await getExecutions(queryWorkflowId as string, includeLogs === 'true');
        console.log(`📡 /api/executions - Returning ${executions.length} executions`);
        console.log('📡 /api/executions - First execution sample:', executions[0]);
        res.status(200).json(executions);
        break;

      case 'POST':
        const { workflowId, triggerData } = req.body;

        if (!workflowId) {
          return res.status(400).json({ error: 'Missing workflowId' });
        }

        // Добавляем задачу в Redis-очередь
        const { getQueueService } = await import('@/lib/queue-service');
        const queueService = getQueueService();
        const { jobId } = await queueService.addJob(workflowId, triggerData || {});

        res.status(201).json({
          jobId,
          message: 'Workflow execution queued successfully'
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
