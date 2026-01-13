import { NextApiRequest, NextApiResponse } from 'next';
import { createWorkflow } from '@/services/workflowService';

/**
 * @swagger
 * /api/workflows/run:
 *   post:
 *     summary: Создать и запустить workflow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workflowData:
 *                 $ref: '#/components/schemas/Workflow'
 *               triggerData:
 *                 type: object
 *                 description: Данные триггера для запуска workflow
 *     responses:
 *       201:
 *         description: Workflow создан и запущен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workflowId:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Ошибка валидации данных
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { workflowData, triggerData } = req.body;

    console.log('🔥 API /workflows/run called with:', { workflowData: !!workflowData, triggerData: !!triggerData });
    console.log('📋 Workflow data:', {
      actions: workflowData?.actions?.length,
      trigger: workflowData?.trigger,
      actionsDetails: workflowData?.actions?.map((a: any) => ({ type: a.type, config: a.config }))
    });

    if (!workflowData || !triggerData) {
      return res.status(400).json({ error: 'Missing required fields: workflowData and triggerData' });
    }

    // Проверяем, что есть действия
    if (!workflowData.actions || workflowData.actions.length === 0) {
      return res.status(400).json({ error: 'Workflow must have at least one action' });
    }

    // Создаем workflow
    console.log('🚀 About to create workflow with data:', {
      name: workflowData.name,
      trigger: workflowData.trigger?.type,
      actionsCount: workflowData.actions?.length,
      hasId: 'id' in workflowData
    });

    let workflow;
    try {
      workflow = await createWorkflow(workflowData);
      console.log('✅ Workflow created:', { id: workflow?.id, name: workflow?.name, type: typeof workflow });
    } catch (createError) {
      console.error('❌ Failed to create workflow:', createError);
      return res.status(500).json({
        error: 'Workflow creation failed',
        details: createError instanceof Error ? createError.message : 'Unknown error'
      });
    }

    // Выполняем workflow синхронно (без очереди)
    if (!workflow || !workflow.id) {
      console.error('❌ Workflow creation returned invalid result:', workflow);
      return res.status(500).json({
        error: 'Workflow creation failed',
        details: 'Invalid workflow object returned'
      });
    }

    try {
      console.log(`🚀 Executing workflow ${workflow.id}...`);
      const { executeWorkflow } = await import('@/services/workflowService');
      const result = await executeWorkflow(workflow.id, triggerData);
      console.log(`✅ Workflow ${workflow.id} completed successfully`);

      res.status(201).json({
        workflowId: workflow.id,
        result,
        message: 'Workflow executed successfully'
      });
    } catch (executionError) {
      console.error(`💥 Workflow ${workflow.id} execution failed:`, executionError);
      res.status(500).json({
        error: 'Workflow execution failed',
        details: executionError instanceof Error ? executionError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
