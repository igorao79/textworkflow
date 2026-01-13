import { NextRequest, NextResponse } from 'next/server';
import { getActiveQStashSchedules } from '@/services/qstashService';

console.log('🔥 API /cron/route.ts: File loaded!');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 API /cron: Getting active QStash schedules');

    const schedules = await getActiveQStashSchedules();

    console.log('✅ Found QStash schedules:', schedules.length);

    // Преобразуем в формат, ожидаемый фронтендом
    const cronTasks = schedules.map(schedule => ({
      workflowId: schedule.workflowId,
      isRunning: schedule.created,
      nextExecution: null, // QStash не предоставляет эту информацию напрямую
      scheduleId: schedule.scheduleId,
      cron: schedule.cron
    }));

    return NextResponse.json(cronTasks);

  } catch (error) {
    console.error('💥 Error getting QStash schedules:', error);
    return NextResponse.json(
      { error: 'Failed to get QStash schedules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🛑 API /cron: Stopping all QStash schedules');

    const { getActiveQStashSchedules, deleteQStashSchedule } = await import('@/services/qstashService');

    const schedules = await getActiveQStashSchedules();
    console.log(`📋 Found ${schedules.length} active schedules to delete`);

    let deletedCount = 0;
    for (const schedule of schedules) {
      try {
        await deleteQStashSchedule(schedule.workflowId);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete schedule for workflow ${schedule.workflowId}:`, error);
      }
    }

    console.log(`✅ Deleted ${deletedCount} QStash schedules`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} QStash schedules`,
      deletedCount
    });

  } catch (error) {
    console.error('💥 Error stopping QStash schedules:', error);
    return NextResponse.json(
      { error: 'Failed to stop QStash schedules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

