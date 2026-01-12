import { NextApiRequest, NextApiResponse } from 'next';
import { executeWorkflow } from '@/services/workflowService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { triggerData } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    console.log(`🚀 Executing workflow ${id} via API`);

    const result = await executeWorkflow(id, triggerData || {});

    console.log(`✅ Workflow ${id} executed successfully`);
    res.status(200).json(result);
  } catch (error) {
    console.error(`❌ Workflow execution failed:`, error);
    res.status(500).json({
      error: 'Workflow execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
