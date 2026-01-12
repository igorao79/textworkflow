import { NextRequest, NextResponse } from 'next/server';

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

    const workflowId = resolvedParams.id;
    console.log('🔥 API /cron/activate: Extracted workflowId:', workflowId);

    if (!workflowId) {
      console.log('❌ API /cron/activate: workflowId is empty/falsy');
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Импортируем функции
    const { stopCronTask, startCronTask } = await import('@/services/cronService');

    // Останавливаем существующую задачу для этого workflow перед активацией новой
    const stopped = stopCronTask(workflowId);
    console.log('🛑 Stopped existing task for workflow:', workflowId, 'result:', stopped);

    // Активируем cron задачу для конкретного workflow
    console.log('🚀 Starting cron task for workflow:', workflowId);
    const started = await startCronTask(workflowId);
    console.log('✅ Cron task start result:', started);

    if (!started) {
      console.error('❌ Failed to start cron task for workflow:', workflowId);
      return NextResponse.json({
        error: 'Failed to start cron task',
        workflowId
      }, { status: 500 });
    }

    // Проверяем, создалась ли задача
    const { getActiveCronTasks } = await import('@/services/cronService');
    const activeTasks = getActiveCronTasks();
    console.log('📊 Active cron tasks after activation:', activeTasks.length, activeTasks);

    // Дополнительная проверка - попробуем получить задачи еще раз через небольшую задержку
    setTimeout(async () => {
      const tasksAfterDelay = getActiveCronTasks();
      console.log('📊 Active cron tasks after 1 second delay:', tasksAfterDelay.length, tasksAfterDelay);
    }, 1000);

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
