import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing cron functionality');

    // Импортируем функции для тестирования
    const { getActiveCronTasks, createCronTask } = await import('@/services/cronService');
    const { getWorkflows } = await import('@/services/workflowService');

    const activeTasks = getActiveCronTasks();
    const workflows = await getWorkflows();
    const cronWorkflows = workflows.filter(w => w.trigger.type === 'cron');

    console.log('📊 Cron test results:', {
      activeTasks: activeTasks.length,
      totalWorkflows: workflows.length,
      cronWorkflows: cronWorkflows.length
    });

    return NextResponse.json({
      success: true,
      data: {
        activeTasks,
        totalWorkflows: workflows.length,
        cronWorkflows: cronWorkflows.length,
        cronWorkflowsDetails: cronWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          isActive: w.isActive,
          trigger: w.trigger
        }))
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
    console.log('🚀 Testing cron task creation');

    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    const { getWorkflow } = await import('@/services/workflowService');
    const { createCronTask } = await import('@/services/cronService');

    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.trigger.type !== 'cron') {
      return NextResponse.json({ error: 'Workflow is not a cron workflow' }, { status: 400 });
    }

    console.log('🔧 Creating test cron task for workflow:', workflowId);
    const created = createCronTask(workflow);

    return NextResponse.json({
      success: true,
      created,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        trigger: workflow.trigger
      }
    });

  } catch (error) {
    console.error('💥 Error creating test cron task:', error);
    return NextResponse.json(
      { error: 'Failed to create test cron task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
