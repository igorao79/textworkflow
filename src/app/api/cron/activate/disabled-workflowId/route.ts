import { NextRequest, NextResponse } from 'next/server';
import { updateCronTasks } from '@/services/cronService';

export const dynamic = 'force-dynamic';

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { workflowId: string } }
// ) {
  console.log('🚀 API /cron/activate/[workflowId] handler called!');
  console.log('📨 Request method:', request.method);
  console.log('🔗 Request URL:', request.url);
  console.log('🔧 Request headers:', Object.fromEntries(request.headers.entries()));

  try {
    console.log('🔥 API /cron/activate: Raw params object:', params);
    console.log('🔥 API /cron/activate: Params keys:', Object.keys(params || {}));
    console.log('🔥 API /cron/activate: Params as JSON:', JSON.stringify(params));

    const { workflowId } = params;

    console.log('🔥 API /cron/activate: Extracted workflowId:', workflowId);
    console.log('🔥 API /cron/activate: workflowId type:', typeof workflowId);
    console.log('🔥 API /cron/activate: workflowId length:', workflowId?.length);

    if (!workflowId) {
      console.log('❌ API /cron/activate: workflowId is empty/falsy');
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Останавливаем существующую задачу для этого workflow перед активацией новой
    const { stopCronTask } = await import('@/services/cronService');
    stopCronTask(workflowId);

    // Активируем cron задачи (это пересоздаст задачу для данного workflow)
    await updateCronTasks();

    console.log('✅ Cron task activated for workflow:', workflowId);

    return NextResponse.json({
      success: true,
      message: 'Cron task activated successfully',
      workflowId
    });

  } catch (error) {
    console.error('💥 Error activating cron task:', error);
    return NextResponse.json(
      { error: 'Failed to activate cron task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
