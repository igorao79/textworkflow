import { NextRequest, NextResponse } from 'next/server';
import { updateCronTasks } from '@/services/cronService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 API /cron/activate/[id] GET handler called!');
  const resolvedParams = await params;
  return NextResponse.json({ message: 'GET method works', params: resolvedParams });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 API /cron/activate/[id] POST handler called!');
  console.log('📨 Request method:', request.method);
  console.log('🔗 Request URL:', request.url);

  try {
    const resolvedParams = await params;
    console.log('🔥 API /cron/activate: Resolved params:', resolvedParams);
    console.log('🔥 API /cron/activate: Params type:', typeof resolvedParams);
    console.log('🔥 API /cron/activate: Params keys:', Object.keys(resolvedParams || {}));

    const workflowId = resolvedParams.id;
    console.log('🔥 API /cron/activate: Extracted workflowId:', workflowId);

    console.log('🔥 API /cron/activate: Extracted workflowId:', workflowId);

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
