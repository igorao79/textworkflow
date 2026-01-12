import { parentPort, workerData } from 'worker_threads';
import { executeWorkflow } from '../services/workflowService';

interface WorkerData {
  workflowId: string;
  triggerData: any;
}

const { workflowId, triggerData } = workerData as WorkerData;

// Функция отправки уведомлений об ошибках (в изолированном контексте)
async function sendErrorNotification(workflowId: string, error: any, execution: any) {
  const notification = {
    type: 'workflow_execution_error',
    workflowId,
    executionId: execution?.id,
    error: error.message,
    timestamp: new Date().toISOString(),
  };

  console.error('🚨 Isolated workflow execution error:', notification);

  // Email уведомление (если настроен)
  if (process.env.RESEND_API_KEY && process.env.ERROR_NOTIFICATION_EMAIL) {
    try {
      // Импортируем resend в изолированном контексте
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'FlowForge <noreply@flowforge.app>',
        to: process.env.ERROR_NOTIFICATION_EMAIL,
        subject: `🚨 Ошибка выполнения workflow ${workflowId}`,
        html: `
          <h2>Ошибка выполнения workflow (изолированный процесс)</h2>
          <p><strong>Workflow ID:</strong> ${workflowId}</p>
          <p><strong>Execution ID:</strong> ${execution?.id || 'N/A'}</p>
          <p><strong>Ошибка:</strong> ${error.message}</p>
          <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email notification from worker:', emailError);
    }
  }

  // Telegram уведомление (если настроен)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ERROR_CHAT_ID) {
    try {
      const { Telegraf } = await import('telegraf');
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      await bot.telegram.sendMessage(
        process.env.TELEGRAM_ERROR_CHAT_ID,
        `🚨 <b>Ошибка выполнения workflow (изолированный процесс)</b>\n\n` +
        `📋 <b>Workflow:</b> ${workflowId}\n` +
        `🔢 <b>Execution:</b> ${execution?.id || 'N/A'}\n` +
        `❌ <b>Ошибка:</b> ${error.message}\n` +
        `⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}`,
        { parse_mode: 'HTML' }
      );
    } catch (telegramError) {
      console.error('Failed to send Telegram notification from worker:', telegramError);
    }
  }
}

async function runWorkflow() {
  try {
    console.log(`🔒 Starting isolated workflow execution: ${workflowId}`);

    const result = await executeWorkflow(workflowId, triggerData);

    console.log(`✅ Isolated workflow completed: ${workflowId}`);

    if (parentPort) {
      parentPort.postMessage({ success: true, result });
    }
  } catch (error: any) {
    console.error(`❌ Isolated workflow failed: ${workflowId}`, error);

    // Отправляем уведомление об ошибке в изолированном контексте
    await sendErrorNotification(workflowId, error, null);

    if (parentPort) {
      parentPort.postMessage({ success: false, error: error.message });
    }
  } finally {
    // Завершаем воркер
    process.exit(0);
  }
}

runWorkflow();
