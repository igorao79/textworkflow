import { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflow, updateWorkflow, deleteWorkflow } from '@/services/workflowService';

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     summary: Получить workflow по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 *       404:
 *         description: Workflow не найден
 *   put:
 *     summary: Обновить workflow
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Workflow'
 *     responses:
 *       200:
 *         description: Workflow обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 *       404:
 *         description: Workflow не найден
 *   delete:
 *     summary: Удалить workflow
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Workflow удален
 *       404:
 *         description: Workflow не найден
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    switch (req.method) {
      case 'GET':
        const workflow = getWorkflow(id);
        if (!workflow) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        res.status(200).json(workflow);
        break;

      case 'PUT':
        const updatedWorkflow = updateWorkflow(id, req.body);
        if (!updatedWorkflow) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        res.status(200).json(updatedWorkflow);
        break;

      case 'DELETE':
        const deleted = deleteWorkflow(id);
        if (!deleted) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        res.status(204).end();
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



