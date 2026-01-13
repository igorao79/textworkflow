const { sql } = require('./src/lib/db');

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');

    // Check workflows table
    const workflowsSchema = await sql(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'workflows'
      ORDER BY ordinal_position
    `);

    console.log('📋 Workflows table schema:');
    workflowsSchema.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });

    console.log('\n' + '='.repeat(50) + '\n');

    // Check workflow_executions table
    const executionsSchema = await sql(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'workflow_executions'
      ORDER BY ordinal_position
    `);

    console.log('📋 Workflow_executions table schema:');
    executionsSchema.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  }
}

checkSchema();
