const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupTestUsersTable() {
  try {
    console.log('🔧 Setting up test_users table...');

    // Читаем SQL файл
    const sqlContent = fs.readFileSync('create-test-users-table.sql', 'utf8');

    // Выполняем SQL
    await pool.query(sqlContent);

    console.log('✅ test_users table setup completed');

    // Проверяем структуру таблицы после обновления
    console.log('\n📋 Checking updated test_users table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'test_users'
      ORDER BY ordinal_position
    `);

    console.log('Columns in test_users table:');
    columns.rows.forEach(col => {
      const defaultInfo = col.column_default ? ` (default: ${col.column_default})` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})${defaultInfo}`);
    });

    // Проверяем, есть ли данные в таблице
    const countResult = await pool.query('SELECT COUNT(*) as count FROM test_users');
    console.log(`\n📊 Records in test_users table: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error setting up test_users table:', error);
  } finally {
    await pool.end();
  }
}

setupTestUsersTable();
