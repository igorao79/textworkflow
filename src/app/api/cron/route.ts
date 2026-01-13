import { NextRequest, NextResponse } from 'next/server';
import { getActiveCronTasks } from '@/services/cronService';

console.log('🔥 API /cron/route.ts: File loaded!');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 API /cron: Getting active cron tasks');

    const cronTasks = getActiveCronTasks();

    console.log('✅ Found cron tasks:', cronTasks.length);

    return NextResponse.json(cronTasks);

  } catch (error) {
    console.error('💥 Error getting cron tasks:', error);
    return NextResponse.json(
      { error: 'Failed to get cron tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🛑 API /cron: Stopping all cron tasks');

    const { stopCronScheduler } = await import('@/services/cronService');
    await stopCronScheduler();

    console.log('✅ All cron tasks stopped');

    return NextResponse.json({ success: true, message: 'All cron tasks stopped' });

  } catch (error) {
    console.error('💥 Error stopping cron tasks:', error);
    return NextResponse.json(
      { error: 'Failed to stop cron tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

