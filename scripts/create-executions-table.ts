import { sql } from '../src/lib/db';

async function createExecutionsTable() {
  try {
    console.log('🚀 Creating executions tables...');

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

    // Исправление типов колонок, если таблицы уже существуют с неправильными типами
    try {
      // Проверяем и исправляем тип id в workflow_executions
      const execIdColumn = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_executions' AND column_name = 'id'
      `);
      if (execIdColumn.length > 0 && execIdColumn[0].data_type !== 'character varying') {
        console.log('🔧 Fixing workflow_executions.id type');
        await sql(`ALTER TABLE workflow_executions ALTER COLUMN id TYPE VARCHAR(255)`);
      }

      // Проверяем и исправляем тип workflow_id в workflow_executions
      const workflowIdColumn = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_executions' AND column_name = 'workflow_id'
      `);
      if (workflowIdColumn.length > 0 && workflowIdColumn[0].data_type !== 'character varying') {
        console.log('🔧 Fixing workflow_executions.workflow_id type');
        await sql(`ALTER TABLE workflow_executions ALTER COLUMN workflow_id TYPE VARCHAR(255)`);
      }
    } catch (alterError) {
      console.log('ℹ️ Schema fix may not be needed or failed, continuing...');
    }

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

    // Исправление типов колонок в workflow_execution_logs
    try {
      // Проверяем и исправляем тип id в workflow_execution_logs
      const logsIdColumn = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_execution_logs' AND column_name = 'id'
      `);
      if (logsIdColumn.length > 0 && logsIdColumn[0].data_type !== 'character varying') {
        console.log('🔧 Fixing workflow_execution_logs.id type');
        await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN id TYPE VARCHAR(255)`);
      }

      // Проверяем и исправляем тип execution_id в workflow_execution_logs
      const executionIdColumn = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_execution_logs' AND column_name = 'execution_id'
      `);
      if (executionIdColumn.length > 0 && executionIdColumn[0].data_type !== 'character varying') {
        console.log('🔧 Fixing workflow_execution_logs.execution_id type');
        await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN execution_id TYPE VARCHAR(255)`);
      }

      // Проверяем и исправляем тип action_id в workflow_execution_logs
      const actionIdColumn = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_execution_logs' AND column_name = 'action_id'
      `);
      if (actionIdColumn.length > 0 && actionIdColumn[0].data_type !== 'character varying') {
        console.log('🔧 Fixing workflow_execution_logs.action_id type');
        await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN action_id TYPE VARCHAR(255)`);
      }
    } catch (alterError) {
      console.log('ℹ️ Logs schema fix may not be needed or failed, continuing...');
    }

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
  } catch (error) {
    console.error('❌ Error creating executions tables:', error);
    process.exit(1);
  }
}

createExecutionsTable();
