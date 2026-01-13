import { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } from '@/services/workflowService';
import '@/services/cronService'; // Инициализируем cron scheduler

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: Получить список всех workflows
 *     responses:
 *       200:
 *         description: Список workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Workflow'
 *   post:
 *     summary: Создать новый workflow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               trigger:
 *                 $ref: '#/components/schemas/WorkflowTrigger'
 *               actions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/WorkflowAction'
 *     responses:
 *       201:
 *         description: Workflow создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workflow'
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`📡 ${req.method} /api/workflows - Starting request`);
    switch (req.method) {
      case 'GET':
        console.log('📡 /api/workflows - Fetching workflows...');
        const workflows = getWorkflows();
        console.log(`📡 /api/workflows - Returning ${workflows.length} workflows`);
        res.status(200).json(workflows);
        break;

      case 'POST':
        const { name, description, trigger, actions } = req.body;

        if (!name || !trigger || !actions) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const workflow = createWorkflow({
          name,
          description,
          trigger,
          actions,
          isActive: true
        });

        res.status(201).json(workflow);
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



