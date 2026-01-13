import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Setting up workflows table...');

    // Создание таблицы для workflows
    await sql(`
      CREATE TABLE IF NOT EXISTS workflows (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_config JSONB NOT NULL,
        actions JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Добавление недостающих колонок (если таблица уже существует)
    try {
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS description TEXT NULL`);
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    } catch (alterError) {
      console.log('ℹ️ Columns may already exist, continuing...');
    }

    // Создание индексов
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC)`);

    console.log('✅ Workflows table created successfully!');
    res.status(200).json({ success: true, message: 'Workflows table created successfully' });
  } catch (error) {
    console.error('❌ Error creating workflows table:', error);
    res.status(500).json({
      error: 'Failed to create workflows table',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
