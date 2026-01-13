import { sql } from './src/lib/db';

async function createAllTables() {
  try {
    console.log('🚀 Creating all tables in new database...');

    // Создание таблицы workflows
    console.log('📋 Creating workflows table...');
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

    // Создание таблицы workflow_executions
    console.log('📋 Creating workflow_executions table...');
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
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_workflow_executions_workflow_id
          FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      )
    `);

    // Создание таблицы workflow_execution_logs
    console.log('📋 Creating workflow_execution_logs table...');
    await sql(`
      CREATE TABLE IF NOT EXISTS workflow_execution_logs (
        id VARCHAR(255) PRIMARY KEY,
        execution_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(50) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        action_id VARCHAR(255) NULL,
        data JSONB NULL,

        CONSTRAINT fk_workflow_execution_logs_execution_id
          FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
      )
    `);

    // Создание таблицы pqueue_tasks
    console.log('📋 Creating pqueue_tasks table...');
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
    console.log('🔍 Creating indexes...');
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution_id ON workflow_execution_logs(execution_id)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_timestamp ON workflow_execution_logs(timestamp DESC)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_status ON pqueue_tasks(status)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_created_at ON pqueue_tasks(created_at DESC)`);

    // Создание триггера для автоматического обновления updated_at
    console.log('⚡ Creating triggers...');
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

    console.log('✅ All tables created successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  - workflows');
    console.log('  - workflow_executions');
    console.log('  - workflow_execution_logs');
    console.log('  - pqueue_tasks');
    console.log('');
    console.log('🔍 Indexes created for performance');
    console.log('⚡ Triggers created for auto-updating timestamps');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createAllTables();
