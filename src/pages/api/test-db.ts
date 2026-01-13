import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    const result = await sql('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');

    // Check if workflows table exists
    const tableCheck = await sql(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'workflows'
      ) as table_exists
    `);

    const workflowsExists = tableCheck[0]?.table_exists;
    console.log('📋 Workflows table exists:', workflowsExists);

    // If table exists, check row count
    let workflowCount = 0;
    if (workflowsExists) {
      const countResult = await sql('SELECT COUNT(*) as count FROM workflows');
      workflowCount = parseInt(countResult[0]?.count || '0');
      console.log('📊 Workflows count:', workflowCount);
    }

    // Check executions if requested
    if (req.method === 'GET' && req.query.check === 'executions') {
      try {
        // Test direct DB query
        const executions = await sql(`
          SELECT COUNT(*) as total FROM workflow_executions
        `);
        const totalInDB = executions[0].total;

        const logs = await sql(`
          SELECT COUNT(*) as count
          FROM workflow_execution_logs
        `);

        // Test getExecutions function
        const { getExecutions } = await import('@/services/workflowService');
        const loadedExecutions = await getExecutions();

        return res.status(200).json({
          totalInDB: totalInDB,
          loadedByGetExecutions: loadedExecutions.length,
          logsCount: logs[0].count,
          isSame: totalInDB === loadedExecutions.length
        });
      } catch (error) {
        return res.status(500).json({
          error: 'Failed to check executions',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Fix schema if needed
    if (req.method === 'POST') {
      console.log('🔧 Attempting to fix database schema...');

      try {
        // Fix workflows.id
        const workflowIdType = await sql(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = 'workflows' AND column_name = 'id'
        `);

        if (workflowIdType.length > 0 && workflowIdType[0].data_type !== 'character varying') {
          console.log('🔄 Fixing workflows.id type...');
          await sql(`ALTER TABLE workflows ALTER COLUMN id TYPE VARCHAR(255)`);
        }

        // Fix workflow_executions columns
        const execColumns = ['id', 'workflow_id'];
        for (const col of execColumns) {
          const colType = await sql(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'workflow_executions' AND column_name = '${col}'
          `);
          if (colType.length > 0 && colType[0].data_type !== 'character varying') {
            console.log(`🔄 Fixing workflow_executions.${col} type...`);
            await sql(`ALTER TABLE workflow_executions ALTER COLUMN ${col} TYPE VARCHAR(255)`);
          }
        }

        // Fix workflow_execution_logs columns
        const logColumns = ['id', 'execution_id', 'action_id'];
        for (const col of logColumns) {
          const colType = await sql(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'workflow_execution_logs' AND column_name = '${col}'
          `);
          if (colType.length > 0 && colType[0].data_type !== 'character varying') {
            console.log(`🔄 Fixing workflow_execution_logs.${col} type...`);
            await sql(`ALTER TABLE workflow_execution_logs ALTER COLUMN ${col} TYPE VARCHAR(255)`);
          }
        }

        console.log('✅ Schema fix completed');

      } catch (fixError) {
        console.error('❌ Schema fix failed:', fixError);
      }
    }

    res.status(200).json({
      success: true,
      databaseConnected: true,
      currentTime: result[0]?.current_time,
      workflowsTableExists: workflowsExists,
      workflowCount: workflowCount
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      databaseConnected: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
