const { sql } = require('./src/lib/db.ts');

async function fixSchema() {
  try {
    console.log('🔧 Fixing database schema...\n');

    // Fix workflows.id
    try {
      const workflowIdType = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflows' AND column_name = 'id'
      `);

      if (workflowIdType.length > 0) {
        console.log(`📋 workflows.id current type: ${workflowIdType[0].data_type}`);

        if (workflowIdType[0].data_type !== 'character varying') {
          console.log('🔄 Changing workflows.id to VARCHAR(255)...');
          await sql(`ALTER TABLE workflows ALTER COLUMN id TYPE VARCHAR(255)`);
          console.log('✅ workflows.id fixed');
        } else {
          console.log('✅ workflows.id already correct');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not check/fix workflows.id:', error.message);
    }

    // Fix workflow_executions.id
    try {
      const execIdType = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_executions' AND column_name = 'id'
      `);

      if (execIdType.length > 0) {
        console.log(`📋 workflow_executions.id current type: ${execIdType[0].data_type}`);

        if (execIdType[0].data_type !== 'character varying') {
          console.log('🔄 Changing workflow_executions.id to VARCHAR(255)...');
          await sql(`ALTER TABLE workflow_executions ALTER COLUMN id TYPE VARCHAR(255)`);
          console.log('✅ workflow_executions.id fixed');
        } else {
          console.log('✅ workflow_executions.id already correct');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not check/fix workflow_executions.id:', error.message);
    }

    // Fix workflow_executions.workflow_id
    try {
      const workflowIdType = await sql(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'workflow_executions' AND column_name = 'workflow_id'
      `);

      if (workflowIdType.length > 0) {
        console.log(`📋 workflow_executions.workflow_id current type: ${workflowIdType[0].data_type}`);

        if (workflowIdType[0].data_type !== 'character varying') {
          console.log('🔄 Changing workflow_executions.workflow_id to VARCHAR(255)...');
          await sql(`ALTER TABLE workflow_executions ALTER COLUMN workflow_id TYPE VARCHAR(255)`);
          console.log('✅ workflow_executions.workflow_id fixed');
        } else {
          console.log('✅ workflow_executions.workflow_id already correct');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not check/fix workflow_executions.workflow_id:', error.message);
    }

    // Fix workflow_execution_logs columns
    const logColumns = ['id', 'execution_id', 'action_id'];

    for (const column of logColumns) {
      try {
        const columnType = await sql(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = 'workflow_execution_logs' AND column_name = '${column}'
        `);

        if (columnType.length > 0) {
          console.log(`📋 workflow_execution_logs.${column} current type: ${columnType[0].data_type}`);

          if (columnType[0].data_type !== 'character varying') {
            console.log(`🔄 Changing workflow_execution_logs.${column} to VARCHAR(255)...`);
            await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN ${column} TYPE VARCHAR(255)`);
            console.log(`✅ workflow_execution_logs.${column} fixed`);
          } else {
            console.log(`✅ workflow_execution_logs.${column} already correct`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not check/fix workflow_execution_logs.${column}:`, error.message);
      }
    }

    console.log('\n🎉 Schema fix completed!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
    process.exit(1);
  }
}

fixSchema();
