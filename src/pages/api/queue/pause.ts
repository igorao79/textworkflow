import { NextApiRequest, NextApiResponse } from 'next';
import { pauseQueue, resumeQueue } from '@/lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (action === 'pause') {
      await pauseQueue();
      res.status(200).json({ message: 'Queue paused successfully' });
    } else if (action === 'resume') {
      await resumeQueue();
      res.status(200).json({ message: 'Queue resumed successfully' });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "pause" or "resume"' });
    }
  } catch (error) {
    console.error('Error managing queue:', error);
    res.status(500).json({ error: 'Failed to manage queue' });
  }
}
