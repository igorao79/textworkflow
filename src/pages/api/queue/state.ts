import { NextApiRequest, NextApiResponse } from 'next';
import { getQueueState } from '@/lib/queue-visualization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📡 API /queue/state called');
    const state = await getQueueState();
    console.log('📊 API /queue/state returning:', state);
    res.status(200).json(state);
  } catch (error) {
    console.error('❌ Error in /api/queue/state:', error);
    res.status(500).json({
      error: 'Failed to get queue state',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
