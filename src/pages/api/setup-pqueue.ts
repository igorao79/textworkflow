import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Setting up PQueue table...');

    // Создание таблицы для PQueue задач
    await sql(`
      CREATE TABLE IF NOT EXISTS pqueue_tasks (
        id VARCHAR(255) PRIMARY KEY,
        task TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        error TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание индексов
    await sql(`CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_status ON pqueue_tasks(status)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_created_at ON pqueue_tasks(created_at DESC)`);

    console.log('✅ PQueue table created successfully!');
    res.status(200).json({ success: true, message: 'PQueue table created successfully' });
  } catch (error) {
    console.error('❌ Error creating PQueue table:', error);
    res.status(500).json({
      error: 'Failed to create PQueue table',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
