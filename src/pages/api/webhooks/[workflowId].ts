import { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflow } from '@/services/workflowService';
import { workflowQueue } from '@/lib/queue';

/**
 * @swagger
 * /api/webhooks/{workflowId}:
 *   post:
 *     summary: Webhook endpoint для запуска workflow
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Данные webhook
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook принят, workflow запущен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *       404:
 *         description: Workflow не найден
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { workflowId } = req.query;

    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Проверяем, существует ли workflow
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Проверяем, что workflow активен и имеет webhook триггер
    if (!workflow.isActive || workflow.trigger.type !== 'webhook') {
      return res.status(400).json({ error: 'Workflow is not active or does not have webhook trigger' });
    }

    // Добавляем задачу в очередь
    const job = await workflowQueue.add({
      workflowId,
      triggerData: {
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Webhook triggered for workflow ${workflowId}, job ID: ${job.id}`);

    res.status(200).json({
      message: 'Webhook received, workflow execution queued',
      jobId: job.id
    });

  } catch (error) {
    console.error('Webhook API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
