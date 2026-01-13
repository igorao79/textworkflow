import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('🔗 Connecting to database...');
console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔗 DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Для разработки
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const sql = async (query: string, params?: unknown[]) => {
  try {
    const client = await pool.connect();
    try {
      console.log(`🔗 Executing query: ${query.substring(0, 50)}...`);
      const result = await client.query(query, params);
      console.log(`🔗 Query completed, returned ${result.rows.length} rows`);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🔗 Database query error:', error);
    throw error;
  }
};
