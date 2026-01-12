import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');

    // Простой тест подключения
    const testResult = await sql(`SELECT 1 as test, NOW() as current_time`);
    console.log('✅ Database test result:', testResult);

    // Попробуем получить информацию о таблицах
    const tablesResult = await sql(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('📋 Available tables:', tablesResult);

    return NextResponse.json({
      success: true,
      test: testResult,
      tables: tablesResult
    });
  } catch (error) {
    console.error('💥 Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}

