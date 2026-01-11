import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧪 Test API called');
  res.status(200).json({ message: 'Test API works', timestamp: new Date().toISOString() });
}
