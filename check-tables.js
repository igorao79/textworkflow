const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    console.log('📋 Checking existing tables...');

    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    console.log('📋 Existing tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));

    // Также проверим структуру test_users таблицы
    if (result.rows.some(row => row.table_name === 'test_users')) {
      console.log('\n📋 Checking test_users table structure...');
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'test_users'
        ORDER BY ordinal_position
      `);

      console.log('Columns in test_users table:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
