import { NextRequest, NextResponse } from 'next/server';
import { getWorkflow, updateWorkflow } from '@/services/workflowService';
import { Workflow, EmailTriggerConfig } from '@/types/workflow';
import { Resend } from 'resend';

console.log('🔥 API /cron/activate/[id]/route.ts: File loaded!');

export const dynamic = 'force-dynamic';

// Инициализация Resend (только если есть API ключ)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Функция отправки тестового письма для email триггера
async function sendEmailTriggerTest(workflow: Workflow) {
  console.log('🔍 sendEmailTriggerTest called for workflow:', workflow.id, 'trigger type:', workflow.trigger.type);

  if (!resend) {
    console.log('⚠️ Resend not configured, skipping email trigger test');
    return;
  }

  if (workflow.trigger.type !== 'email') {
    console.log('ℹ️ Not an email trigger, skipping test email');
    return; // Только для email триггеров
  }

  try {
    console.log('📧 Sending test email for email trigger workflow:', workflow.id);

    const emailConfig = workflow.trigger.config as EmailTriggerConfig;

    // Отправляем тестовое письмо на указанный email получателя или на дефолтный
    const testRecipient = emailConfig.to || 'samptv59@gmail.com';

    const emailData = {
      from: 'onboarding@resend.dev', // Фиксированный отправитель
      to: testRecipient,
      subject: `Тест email триггера: ${workflow.name}`,
      text: `🧪 Тест email триггера

Это тестовое письмо для проверки работы email триггера workflow "${workflow.name}".

Информация о workflow:
• ID: ${workflow.id}
• Название: ${workflow.name}
• Действий: ${workflow.actions.length}
• Статус: Активен

Это письмо отправлено автоматически при активации workflow с email триггером.
Workflow теперь будет реагировать на входящие письма согласно настройкам триггера.

---
FlowForge - система автоматизации рабочих процессов`,
    };

    console.log('📤 Attempting to send email to:', testRecipient, 'from:', emailData.from);

    const result = await resend.emails.send(emailData);
    console.log('📨 Resend result:', result);

    if (result.error) {
      console.error('❌ Failed to send email trigger test:', result.error);
    } else {
      console.log('✅ Email trigger test sent successfully to:', testRecipient, 'ID:', result.data?.id);
    }
  } catch (error) {
    console.error('💥 Error sending email trigger test:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 === API /cron/activate/[id] GET handler called! ===');
  console.log('🔗 GET Request URL:', request.url);
  const resolvedParams = await params;
  console.log('🔥 GET Resolved params:', resolvedParams);
  return NextResponse.json({
    message: 'GET method works',
    params: resolvedParams,
    debug: {
      timestamp: new Date().toISOString(),
      method: 'GET'
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 === API /cron/activate/[id] POST handler START ===');
  console.log('📨 Request method:', request.method);
  console.log('🔗 Request URL:', request.url);
  console.log('🔑 RESEND_API_KEY available:', !!process.env.RESEND_API_KEY);

  // Логируем факт вызова функции
  console.log('🔥 POST handler function called at:', new Date().toISOString());

  try {
    console.log('🔥 API /cron/activate: Starting try block');
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

    // Сначала активируем workflow в базе данных
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      console.log('❌ API /cron/activate: Workflow not found:', workflowId);
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    console.log('🔄 API /cron/activate: Current workflow status:', { id: workflow.id, isActive: workflow.isActive });

    if (!workflow.isActive) {
      console.log('🔄 API /cron/activate: Activating workflow in database:', workflowId);
      const updatedWorkflow = { ...workflow, isActive: true, updatedAt: new Date() };
      updateWorkflow(workflowId, updatedWorkflow);
      console.log('✅ API /cron/activate: Workflow activated in database');
    } else {
      console.log('ℹ️ API /cron/activate: Workflow already active');
    }

    // Проверяем, что workflow действительно активен после обновления
    const updatedWorkflowCheck = getWorkflow(workflowId);
    console.log('🔍 API /cron/activate: Workflow status after update:', { id: updatedWorkflowCheck?.id, isActive: updatedWorkflowCheck?.isActive });

    // Если это cron workflow, управляем cron задачами
    if (workflow.trigger.type === 'cron') {
      // Останавливаем существующую задачу для этого workflow перед активацией новой
      const { stopCronTask, createCronTask } = await import('@/services/cronService');
      stopCronTask(workflowId);

      // Создаем новую cron задачу для данного workflow
      console.log('🚀 API /cron/activate: About to call createCronTask for workflow:', workflow.id);
      const created = createCronTask(workflow);
      console.log('🚀 API /cron/activate: createCronTask returned:', created);
      if (created) {
        console.log('✅ API /cron/activate: Cron task created successfully');
      } else {
        console.log('❌ API /cron/activate: Failed to create cron task - returning 500');
        return NextResponse.json({ error: 'Failed to create cron task' }, { status: 500 });
      }
    }

    console.log('✅ Workflow activated for workflow:', workflowId);

    // Отправляем тестовое письмо для email триггера
    await sendEmailTriggerTest(updatedWorkflowCheck || workflow);

    return NextResponse.json({
      success: true,
      message: 'Workflow activated successfully',
      workflowId,
      triggerType: workflow.trigger.type,
      debug: {
        timestamp: new Date().toISOString(),
        logs: 'API endpoint executed successfully'
      }
    });

  } catch (error) {
    console.error('💥 Error activating cron task:', error);
    return NextResponse.json(
      { error: 'Failed to activate cron task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
