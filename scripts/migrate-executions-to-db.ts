import { sql } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function migrateExecutionsToDb() {
  try {
    console.log('🚀 Starting migration of executions to database...');

    // Проверяем, есть ли файл с executions
    const DATA_DIR = path.join(process.cwd(), 'data');
    const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

    if (!fs.existsSync(EXECUTIONS_FILE)) {
      console.log('ℹ️ No executions file found, nothing to migrate');
      return;
    }

    // Читаем executions из файла
    const fileData = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    const executions = JSON.parse(fileData);

    console.log(`📊 Found ${executions.length} executions to migrate`);

    // Миграция executions
    for (const execution of executions) {
      console.log(`Migrating execution ${execution.id}...`);

      // Вставляем execution
      await sql(`
        INSERT INTO workflow_executions (
          id, workflow_id, status, started_at, completed_at, error, result
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        execution.id,
        execution.workflowId,
        execution.status,
        new Date(execution.startedAt).toISOString(),
        execution.completedAt ? new Date(execution.completedAt).toISOString() : null,
        execution.error || null,
        execution.result ? JSON.stringify(execution.result) : null
      ]);

      // Вставляем логи
      if (execution.logs && execution.logs.length > 0) {
        for (const log of execution.logs) {
          await sql(`
            INSERT INTO workflow_execution_logs (
              id, execution_id, timestamp, level, message, action_id, data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [
            log.id,
            execution.id,
            new Date(log.timestamp).toISOString(),
            log.level,
            log.message,
            log.actionId || null,
            log.data ? JSON.stringify(log.data) : null
          ]);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📈 Migrated ${executions.length} executions with their logs`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateExecutionsToDb();
