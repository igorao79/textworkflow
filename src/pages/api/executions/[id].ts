import { NextApiRequest, NextApiResponse } from 'next';
import { getExecution } from '@/services/workflowService';

/**
 * @swagger
 * /api/executions/{id}:
 *   get:
 *     summary: Получить детали выполнения workflow
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Детали выполнения
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkflowExecution'
 *       404:
 *         description: Выполнение не найдено
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid execution ID' });
    }

    switch (req.method) {
      case 'GET':
        const execution = await getExecution(id);
        if (!execution) {
          return res.status(404).json({ error: 'Execution not found' });
        }
        res.status(200).json(execution);
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}




