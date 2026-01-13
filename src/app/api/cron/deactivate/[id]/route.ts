import { NextRequest, NextResponse } from 'next/server';
import { stopCronTask } from '@/services/cronService';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🛑 API /cron/deactivate/[id] called!');
  console.log('🔗 Request URL:', request.url);

  try {
    const resolvedParams = await params;
    const workflowId = resolvedParams.id;
    const url = new URL(request.url);
    const clearQueue = url.searchParams.get('clearQueue') === 'true';

    console.log('🔥 Deactivating cron for workflowId:', workflowId, clearQueue ? '(with queue cleanup)' : '(cron only)');

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    const stopped = await stopCronTask(workflowId, clearQueue);
    if (stopped) {
      console.log('✅ Cron task deactivated for workflow:', workflowId);
      return NextResponse.json({
        message: `Cron task deactivated for workflow ${workflowId}${clearQueue ? ' (queue cleared)' : ''}`,
        success: true,
        stopped: true,
        queueCleared: clearQueue
      });
    } else {
      console.log('⚠️ Cron task deactivation returned false for workflow:', workflowId);
      return NextResponse.json({
        error: 'Failed to deactivate cron task',
        success: false,
        stopped: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error('💥 Error stopping cron task:', error);
    return NextResponse.json({ error: 'Failed to deactivate cron task' }, { status: 500 });
  }
}
