import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 API /users: Getting users from database');
    console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🔗 DATABASE_URL value:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    // Сначала попробуем простой тестовый запрос
    console.log('🔍 Testing database connection...');
    const testResult = await sql(`SELECT 1 as test`);
    console.log('✅ Database connection test:', testResult);

    const users = await sql(`
      SELECT id, name, email, created_at
      FROM test_users
      ORDER BY created_at DESC
    `);

    console.log('✅ Found users:', users.length);
    console.log('📊 Users data:', users);

    return NextResponse.json(users);
  } catch (error) {
    console.error('💥 Error getting users:', error);
    console.error('💥 Error details:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to get users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
