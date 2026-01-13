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
    console.log('🔥 Deactivating cron for workflowId:', workflowId);

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    const stopped = await stopCronTask(workflowId);
    if (stopped) {
      console.log('✅ Cron task deactivated for workflow:', workflowId);
      return NextResponse.json({
        message: `Cron task deactivated for workflow ${workflowId}`,
        success: true,
        stopped: true
      });
    } else {
      return NextResponse.json({
        error: 'Cron task not found or already stopped',
        success: false,
        stopped: false
      }, { status: 404 });
    }
  } catch (error) {
    console.error('💥 Error stopping cron task:', error);
    return NextResponse.json({ error: 'Failed to deactivate cron task' }, { status: 500 });
  }
}
