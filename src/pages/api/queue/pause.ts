import { NextApiRequest, NextApiResponse } from 'next';
import { getQueueService } from '@/lib/queue-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    // QueueService не поддерживает pause/resume операции
    if (action === 'pause' || action === 'resume') {
      res.status(400).json({ error: 'Pause/resume operations not supported by current queue implementation' });
    } else {
      res.status(400).json({ error: 'Invalid action. No actions supported by current queue implementation' });
    }
  } catch (error) {
    console.error('Error managing queue:', error);
    res.status(500).json({ error: 'Failed to manage queue' });
  }
}




