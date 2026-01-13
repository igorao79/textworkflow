import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Setting up executions tables...');

    // Создание таблицы workflow_executions
    await sql(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id VARCHAR(255) PRIMARY KEY,
        workflow_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        error TEXT NULL,
        result JSONB NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы workflow_execution_logs
    await sql(`
      CREATE TABLE IF NOT EXISTS workflow_execution_logs (
        id VARCHAR(255) PRIMARY KEY,
        execution_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(50) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        action_id VARCHAR(255) NULL,
        data JSONB NULL
      )
    `);

    // Создание индексов
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution_id ON workflow_execution_logs(execution_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_timestamp ON workflow_execution_logs(timestamp DESC)`);

    // Создание триггера для updated_at
    await sql(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await sql(`
      CREATE TRIGGER update_workflow_executions_updated_at
          BEFORE UPDATE ON workflow_executions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Executions tables created successfully!');
    res.status(200).json({ success: true, message: 'Executions tables created successfully' });
  } catch (error) {
    console.error('❌ Error creating executions tables:', error);
    res.status(500).json({ error: 'Failed to create executions tables', details: error.message });
  }
}
