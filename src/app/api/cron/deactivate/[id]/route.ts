import { NextRequest, NextResponse } from 'next/server';
import { deleteQStashSchedule } from '@/services/qstashService';

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

    console.log('🔥 Deactivating QStash schedule for workflowId:', workflowId);

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    const deleted = await deleteQStashSchedule(workflowId);
    if (deleted) {
      console.log('✅ QStash schedule deactivated for workflow:', workflowId);
      return NextResponse.json({
        message: `QStash schedule deactivated for workflow ${workflowId}`,
        success: true,
        stopped: true
      });
    } else {
      console.log('⚠️ QStash schedule deactivation returned false for workflow:', workflowId);
      return NextResponse.json({
        error: 'Failed to deactivate QStash schedule',
        success: false,
        stopped: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error('💥 Error stopping cron task:', error);
    return NextResponse.json({ error: 'Failed to deactivate cron task' }, { status: 500 });
  }
}
