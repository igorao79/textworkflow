import { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflow } from '@/services/workflowService';

// Простой in-memory cache для предотвращения дублирования webhook вызовов
const webhookCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5000; // 5 секунд между вызовами одного workflow

// Функция очистки старых cooldown записей
function cleanupCooldowns() {
  const now = Date.now();
  for (const [workflowId, timestamp] of webhookCooldowns.entries()) {
    if (now - timestamp > COOLDOWN_MS * 2) {
      webhookCooldowns.delete(workflowId);
    }
  }
}

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
 *         description: Webhook принят, workflow запущен или игнорирован из-за cooldown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 ignored:
 *                   type: boolean
 *                   description: true если webhook был игнорирован из-за cooldown
 *       404:
 *         description: Workflow не найден
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Очищаем старые cooldown записи
    cleanupCooldowns();

    const { workflowId } = req.query;

    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    // Проверяем, существует ли workflow
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Проверяем, что workflow активен и имеет webhook триггер
    if (!workflow.isActive || workflow.trigger.type !== 'webhook') {
      return res.status(400).json({ error: 'Workflow is not active or does not have webhook trigger' });
    }

    // Проверяем cooldown для предотвращения дублирования
    const now = Date.now();
    const lastCall = webhookCooldowns.get(workflowId);
    if (lastCall && (now - lastCall) < COOLDOWN_MS) {
      console.log(`⏱️ Webhook for workflow ${workflowId} ignored due to cooldown (${COOLDOWN_MS}ms)`);
      return res.status(200).json({
        message: 'Webhook ignored due to cooldown',
        ignored: true
      });
    }

    // Обновляем timestamp последнего вызова
    webhookCooldowns.set(workflowId, now);

    // Добавляем задачу в Redis-очередь
    const { getQueueService } = await import('@/lib/queue-service');
    const queueService = getQueueService();
    const { jobId } = await queueService.addJob(workflowId, {
      method: req.method,
      headers: req.headers,
        body: req.body,
        query: req.query,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Webhook triggered for workflow ${workflowId}, job ID: ${jobId}`);

    res.status(200).json({
      message: 'Webhook received, workflow execution queued',
      jobId: job.id
    });

  } catch (error) {
    console.error('Webhook API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



