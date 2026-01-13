import { Client } from '@upstash/qstash';
import { Receiver } from '@upstash/qstash';

// Инициализация QStash клиента
let qstashClient: Client | null = null;
let qstashReceiver: Receiver | null = null;

function getQStashClient(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error('QSTASH_TOKEN environment variable is required. Get it from https://console.upstash.com/qstash');
    }
    qstashClient = new Client({ token });
    console.log('✅ QStash client initialized');
  }
  return qstashClient;
}

function getQStashReceiver(): Receiver {
  if (!qstashReceiver) {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentKey || !nextKey) {
      throw new Error('QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY environment variables are required. Get them from https://console.upstash.com/qstash');
    }

    qstashReceiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });
    console.log('✅ QStash receiver initialized');
  }
  return qstashReceiver;
}

export interface QStashSchedule {
  scheduleId: string;
  workflowId: string;
  cron: string;
  destination: string;
  created: boolean;
}

const activeSchedules = new Map<string, QStashSchedule>();

interface QStashWebhookPayload {
  workflowId: string;
  trigger: 'cron';
  timestamp?: string;
  source: 'qstash';
}

export async function createQStashSchedule(workflowId: string, cronExpression: string): Promise<QStashSchedule> {
  console.log(`🚀 Creating QStash schedule for workflow: ${workflowId} with cron: ${cronExpression}`);
  console.log(`🔍 Environment check - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔍 NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);

  // В режиме разработки отключаем QStash и используем node-cron как fallback
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost') || process.env.NEXT_PUBLIC_APP_URL.includes('127.0.0.1');

  if (isDevelopment) {
    console.log('🧪 Development/local mode detected, using node-cron fallback');
    console.log(`📋 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`📋 NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    console.log('🧪 Development mode: QStash disabled, using node-cron fallback');

    // Импортируем старый cron сервис для development
    const { createCronTask } = await import('./cronService');
    const { getWorkflow } = await import('./workflowService');

    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const created = createCronTask(workflow);
    if (!created) {
      throw new Error('Failed to create cron task in development mode');
    }

    // Возвращаем mock schedule для совместимости с UI
    const mockSchedule: QStashSchedule = {
      scheduleId: `dev-${workflowId}-${Date.now()}`,
      workflowId,
      cron: cronExpression,
      destination: 'development-mode',
      created: true
    };

    activeSchedules.set(workflowId, mockSchedule);
    return mockSchedule;
  }

  try {
    const client = getQStashClient();

    // Получаем URL приложения
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required for QStash in production mode. For local development, use ngrok tunnel or set NODE_ENV=development');
    }

    // Проверяем, что URL не localhost
    if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1') || appUrl.includes('::1')) {
      throw new Error('NEXT_PUBLIC_APP_URL cannot be localhost. Use ngrok tunnel or your production domain. For local development, set NODE_ENV=development to use node-cron fallback');
    }

    // Создаем URL для webhook - это будет наш API endpoint
    const destinationUrl = `${appUrl}/api/qstash/webhook`;

    console.log(`📍 Webhook destination: ${destinationUrl}`);

    const schedule = await client.schedules.create({
      destination: destinationUrl,
      cron: cronExpression,
      body: JSON.stringify({
        workflowId: workflowId,
        trigger: 'cron',
        timestamp: new Date().toISOString(),
        source: 'qstash'
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      retries: 3,
      timeout: 30, // 30 секунд timeout
      label: `workflow-${workflowId}`
    });

    const qstashSchedule: QStashSchedule = {
      scheduleId: schedule.scheduleId,
      workflowId,
      cron: cronExpression,
      destination: destinationUrl,
      created: true
    };

    activeSchedules.set(workflowId, qstashSchedule);

    console.log(`✅ QStash schedule created: ${schedule.scheduleId} for workflow ${workflowId}`);
    console.log(`📅 Cron expression: ${cronExpression}`);

    return qstashSchedule;

  } catch (error) {
    console.error(`❌ Failed to create QStash schedule for workflow ${workflowId}:`, error);
    throw error;
  }
}

export async function deleteQStashSchedule(workflowId: string): Promise<boolean> {
  console.log(`🛑 Deleting QStash schedule for workflow: ${workflowId}`);

  // В режиме разработки используем node-cron fallback
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Development mode: Deleting node-cron task');

    const { stopCronTask } = await import('./cronService');
    const stopped = stopCronTask(workflowId);

    activeSchedules.delete(workflowId);
    return stopped;
  }

  try {
    const schedule = activeSchedules.get(workflowId);
    if (!schedule) {
      console.log(`ℹ️ No QStash schedule found for workflow: ${workflowId}`);
      return true; // Считаем успехом, если расписания нет
    }

    const client = getQStashClient();
    await client.schedules.delete(schedule.scheduleId);

    activeSchedules.delete(workflowId);

    console.log(`✅ QStash schedule deleted: ${schedule.scheduleId} for workflow ${workflowId}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to delete QStash schedule for workflow ${workflowId}:`, error);
    // Даже при ошибке удаляем из локальной карты
    activeSchedules.delete(workflowId);
    return false;
  }
}

export async function getActiveQStashSchedules(): Promise<QStashSchedule[]> {
  console.log(`📋 Getting active QStash schedules: ${activeSchedules.size}`);
  return Array.from(activeSchedules.values());
}

export async function verifyQStashWebhook(signature: string, body: string, url: string): Promise<boolean> {
  try {
    const receiver = getQStashReceiver();
    await receiver.verify({ signature, body, url });
    console.log('✅ QStash webhook signature verified');
    return true;
  } catch (error) {
    console.error('❌ QStash webhook signature verification failed:', error);
    return false;
  }
}

export async function processQStashWebhook(payload: QStashWebhookPayload): Promise<void> {
  console.log('🎣 Processing QStash webhook payload:', payload);
  console.log('📊 Payload details:', {
    workflowId: payload.workflowId,
    trigger: payload.trigger,
    source: payload.source,
    timestamp: payload.timestamp
  });

  try {
    const { workflowId, trigger, timestamp, source } = payload;

    if (source !== 'qstash' || trigger !== 'cron') {
      console.warn('⚠️ Invalid webhook payload - not from QStash cron');
      console.warn('📋 Expected source: qstash, trigger: cron');
      console.warn('📋 Received source:', source, 'trigger:', trigger);
      return;
    }

    if (!workflowId) {
      console.error('❌ No workflowId in webhook payload');
      return;
    }

    console.log(`🚀 Executing workflow ${workflowId} from QStash webhook`);
    console.log('⏰ Execution timestamp:', timestamp || new Date().toISOString());

    // Импортируем функцию выполнения workflow
    const { executeWorkflow } = await import('./workflowService');

    console.log('🔄 Calling executeWorkflow...');

    try {
      await executeWorkflow(workflowId, {
        trigger: 'cron',
        timestamp: timestamp || new Date().toISOString(),
        source: 'qstash'
      });

      console.log(`✅ Workflow ${workflowId} executed successfully from QStash`);
    } catch (executionError) {
      // Если workflow не найден или уже удален - логируем предупреждение вместо падения
      if (executionError instanceof Error && executionError.message.includes('not found')) {
        console.warn(`⚠️ Workflow ${workflowId} not found or deleted, skipping execution`);
        console.warn('📋 This can happen if workflow was deleted but QStash schedule is still active');
        console.warn('🔧 Solution: Delete old schedules in QStash dashboard or recreate workflow');
        return; // Не бросаем ошибку, просто выходим
      }

      // Для других ошибок - бросаем дальше
      throw executionError;
    }

  } catch (error) {
    console.error('❌ Failed to process QStash webhook:', error);
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
