const { sql } = require('../src/lib/db');

async function setupWorkflowsTable() {
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

    // Исправление типа id колонки, если таблица уже существует с неправильным типом
    try {
      // Проверяем тип колонки id
      const columnInfo = await sql(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'workflows' AND column_name = 'id'
      `);

      if (columnInfo.length > 0 && columnInfo[0].data_type !== 'character varying') {
        console.log('🔧 Fixing id column type from', columnInfo[0].data_type, 'to VARCHAR(255)');
        await sql(`ALTER TABLE workflows ALTER COLUMN id TYPE VARCHAR(255)`);
      }

      // Добавление недостающих колонок
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS description TEXT NULL`);
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
      await sql(`ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    } catch (alterError) {
      console.log('ℹ️ Columns may already exist or alter failed, continuing...');
    }

    // Создание индексов
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active)`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC)`);

    console.log('✅ Workflows table created successfully!');
  } catch (error) {
    console.error('❌ Error creating workflows table:', error);
    process.exit(1);
  }
}

setupWorkflowsTable();
