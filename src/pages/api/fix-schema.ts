import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Starting database schema fix...');

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
      console.log('⚠️ Could not check/fix workflows.id:', error instanceof Error ? error.message : String(error));
    }

    // Fix workflow_executions columns
    const execColumns = ['id', 'workflow_id'];
    for (const col of execColumns) {
      try {
        const colType = await sql(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = 'workflow_executions' AND column_name = '${col}'
        `);

        if (colType.length > 0) {
          console.log(`📋 workflow_executions.${col} current type: ${colType[0].data_type}`);

          if (colType[0].data_type !== 'character varying') {
            console.log(`🔄 Changing workflow_executions.${col} to VARCHAR(255)...`);
            await sql(`ALTER TABLE workflow_executions ALTER COLUMN ${col} TYPE VARCHAR(255)`);
            console.log(`✅ workflow_executions.${col} fixed`);
          } else {
            console.log(`✅ workflow_executions.${col} already correct`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not check/fix workflow_executions.${col}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Fix workflow_execution_logs columns
    const logColumns = ['id', 'execution_id', 'action_id'];
    for (const col of logColumns) {
      try {
        const colType = await sql(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = 'workflow_execution_logs' AND column_name = '${col}'
        `);

        if (colType.length > 0) {
          console.log(`📋 workflow_execution_logs.${col} current type: ${colType[0].data_type}`);

          if (colType[0].data_type !== 'character varying') {
            console.log(`🔄 Changing workflow_execution_logs.${col} to VARCHAR(255)...`);
            await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN ${col} TYPE VARCHAR(255)`);
            console.log(`✅ workflow_execution_logs.${col} fixed`);
          } else {
            console.log(`✅ workflow_execution_logs.${col} already correct`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not check/fix workflow_execution_logs.${col}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log('🎉 Schema fix completed successfully!');
    res.status(200).json({
      success: true,
      message: 'Database schema fixed successfully'
    });

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix database schema',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
