import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 Testing cron functionality');

    // Импортируем функции для тестирования
    const { getActiveQStashSchedules } = await import('@/services/qstashService');
    const { getWorkflows } = await import('@/services/workflowService');

    const activeSchedules = await getActiveQStashSchedules();
    const workflows = await getWorkflows();
    const cronWorkflows = workflows.filter(w => w.trigger.type === 'cron');

    console.log('📊 QStash test results:', {
      activeSchedules: activeSchedules.length,
      totalWorkflows: workflows.length,
      cronWorkflows: cronWorkflows.length
    });

    // Дополнительная информация о внутреннем состоянии
    const internalState = {
      activeSchedulesCount: activeSchedules.length,
      cronWorkflowsCount: cronWorkflows.length
    };

    return NextResponse.json({
      success: true,
      data: {
        activeSchedules,
        totalWorkflows: workflows.length,
        cronWorkflows: cronWorkflows.length,
        cronWorkflowsDetails: cronWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          isActive: w.isActive,
          trigger: w.trigger
        })),
        internalState
      }
    });

  } catch (error) {
    console.error('💥 Error testing cron:', error);
    return NextResponse.json(
      { error: 'Failed to test cron', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, action } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    const { getWorkflow } = await import('@/services/workflowService');

    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.trigger.type !== 'cron') {
      return NextResponse.json({ error: 'Workflow is not a cron workflow' }, { status: 400 });
    }

    if (action === 'create') {
      console.log('🔧 Creating test QStash schedule for workflow:', workflowId);
      const { createQStashSchedule } = await import('@/services/qstashService');

      // Используем cron выражение для тестирования (каждую минуту)
      const cronExpression = '* * * * *';
      const schedule = await createQStashSchedule(workflowId, cronExpression);

      return NextResponse.json({
        success: true,
        action: 'create',
        schedule,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          trigger: workflow.trigger
        }
      });
    } else if (action === 'trigger') {
      console.log('🚀 Manually triggering cron workflow:', workflowId);

      try {
        // Имитируем cron выполнение - напрямую вызываем executeWorkflow
        const { executeWorkflow } = await import('@/services/workflowService');

        await executeWorkflow(workflowId, {
          trigger: 'cron' as const,
          timestamp: new Date().toISOString(),
          timezone: 'Europe/Moscow'
        });

        return NextResponse.json({
          success: true,
          action: 'trigger',
          message: 'Workflow triggered manually',
          workflow: {
            id: workflow.id,
            name: workflow.name
          }
        });
      } catch (triggerError) {
        console.error('❌ Manual trigger failed:', triggerError);
        return NextResponse.json({
          error: 'Failed to trigger workflow',
          details: triggerError instanceof Error ? triggerError.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "create" or "trigger"' }, { status: 400 });
    }

  } catch (error) {
    console.error('💥 Error in test cron API:', error);
    return NextResponse.json(
      { error: 'Failed to process test cron request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
