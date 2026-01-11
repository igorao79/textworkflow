import { Resend } from 'resend';
import axios from 'axios';
import { Telegraf } from 'telegraf';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowExecutionLog,
  EmailActionConfig,
  HttpActionConfig,
  TelegramActionConfig,
  DatabaseActionConfig,
  TransformActionConfig
} from '@/types/workflow';

// Инициализация сервисов (только если есть API ключи)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const telegramBot = process.env.TELEGRAM_BOT_TOKEN ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN) : null;

// Инициализация подключения к PostgreSQL
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Обработчик ошибок подключения к БД
dbPool?.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Папка для хранения данных
const DATA_DIR = path.join(process.cwd(), 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

// Создаем папку data если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Функция отправки уведомлений об ошибках
async function sendErrorNotification(workflowId: string, error: unknown, execution: WorkflowExecution) {
  const notification = {
    type: 'workflow_execution_error',
    workflowId,
    executionId: execution.id,
    error: error instanceof Error ? error.message : String(error),
    attempts: execution.logs.filter(log => log.level === 'error').length,
    timestamp: new Date().toISOString(),
  };

  console.error('🚨 Workflow execution error:', notification);

  // Email уведомление (если настроено)
  if (process.env.RESEND_API_KEY && process.env.ERROR_NOTIFICATION_EMAIL) {
    try {
      await resend?.emails.send({
        from: 'FlowForge <noreply@flowforge.app>',
        to: process.env.ERROR_NOTIFICATION_EMAIL,
        subject: `🚨 Ошибка выполнения workflow ${workflowId}`,
        html: `
          <h2>Ошибка выполнения workflow</h2>
          <p><strong>Workflow ID:</strong> ${workflowId}</p>
          <p><strong>Execution ID:</strong> ${execution.id}</p>
          <p><strong>Ошибка:</strong> ${error instanceof Error ? error.message : String(error)}</p>
          <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }
  }

  // Telegram уведомление (если настроено)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ERROR_CHAT_ID) {
    try {
      await telegramBot?.telegram.sendMessage(
        process.env.TELEGRAM_ERROR_CHAT_ID,
        `🚨 <b>Ошибка выполнения workflow</b>\n\n` +
        `📋 <b>Workflow:</b> ${workflowId}\n` +
        `🔢 <b>Execution:</b> ${execution.id}\n` +
        `❌ <b>Ошибка:</b> ${error instanceof Error ? error.message : String(error)}\n` +
        `⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}`,
        { parse_mode: 'HTML' }
      );
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
    }
  }
}

// Функция паузы выполнения workflow
export async function pauseWorkflowExecution(workflowId: string, duration: number): Promise<void> {
  return new Promise((resolve) => {
    console.log(`⏸️ Pausing workflow ${workflowId} for ${duration}ms`);
    setTimeout(() => {
      console.log(`▶️ Resuming workflow ${workflowId}`);
      resolve();
    }, duration);
  });
}

// Функции для загрузки/сохранения данных
function loadWorkflows(): Workflow[] {
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      const data = fs.readFileSync(WORKFLOWS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Преобразуем даты обратно в объекты Date
      return parsed.map((workflow: Omit<Workflow, 'createdAt' | 'updatedAt'> & {
        createdAt: string;
        updatedAt: string;
      }) => ({
        ...workflow,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt)
      }));
    }
  } catch (error) {
    console.error('Error loading workflows:', error);
  }
  return [];
}

function saveWorkflows(workflows: Workflow[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
  } catch (error) {
    console.error('Error saving workflows:', error);
  }
}

function loadExecutions(): WorkflowExecution[] {
  try {
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Преобразуем даты обратно в объекты Date
      return parsed.map((execution: Omit<WorkflowExecution, 'startedAt' | 'completedAt' | 'logs'> & {
        startedAt: string;
        completedAt?: string;
        logs: (Omit<WorkflowExecutionLog, 'timestamp'> & { timestamp: string })[];
      }) => ({
        ...execution,
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
        logs: execution.logs.map((log: Omit<WorkflowExecutionLog, 'timestamp'> & { timestamp: string }) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
      }));
    }
  } catch (error) {
    console.error('Error loading executions:', error);
  }
  return [];
}

function saveExecutions(executions: WorkflowExecution[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
  } catch (error) {
    console.error('Error saving executions:', error);
  }
}

function updateExecutionInFile(updatedExecution: WorkflowExecution): void {
  try {
    const executions = loadExecutions();
    const index = executions.findIndex(e => e.id === updatedExecution.id);
    if (index !== -1) {
      executions[index] = updatedExecution;
      saveExecutions(executions);
      console.log(`✅ Updated execution ${updatedExecution.id} in file`);
    } else {
      console.warn(`⚠️ Execution ${updatedExecution.id} not found for update`);
    }
  } catch (error) {
    console.error('Error updating execution in file:', error);
  }
}

// Хранилище workflow с загрузкой из файлов
const workflows: Workflow[] = loadWorkflows();

export async function executeWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<WorkflowExecution> {
  console.log(`🔄 WorkflowService: executeWorkflow called for ${workflowId} with trigger:`, triggerData);

  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) {
    console.error(`❌ WorkflowService: Workflow ${workflowId} not found`);
    throw new Error(`Workflow ${workflowId} not found`);
  }

  console.log(`✅ WorkflowService: Found workflow ${workflowId}, actions: ${workflow.actions.length}`);

  const execution: WorkflowExecution = {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workflowId,
    status: 'running',
    startedAt: new Date(),
    logs: []
  };

  // Читаем текущие executions из файла, добавляем новый и сохраняем
  const currentExecutions = loadExecutions();
  currentExecutions.push(execution);
  saveExecutions(currentExecutions);

  try {
    // Выполняем действия workflow последовательно
    for (const action of workflow.actions) {
      await executeAction(action, triggerData, execution);
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.result = triggerData; // Сохраняем результаты выполнения

    // Логируем завершение и обновляем в файле
    addLog(execution, 'info', 'Workflow execution completed successfully');
    updateExecutionInFile(execution);

  } catch (error: unknown) {
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : String(error);
    execution.completedAt = new Date();

    addLog(execution, 'error', `Workflow execution failed: ${execution.error}`);
    updateExecutionInFile(execution);

    console.error(`Workflow ${workflowId} failed:`, error);

    // Отправляем уведомление об ошибке
    await sendErrorNotification(workflowId, error, execution);

    throw error;
  }

  return execution;
}

async function executeAction(
  action: WorkflowAction,
  triggerData: Record<string, unknown>,
  execution: WorkflowExecution
): Promise<void> {
  try {
    addLog(execution, 'info', `Executing action: ${action.type}`, action.id);

    switch (action.type) {
      case 'email':
        await executeEmailAction(action.config as EmailActionConfig, triggerData);
        break;
      case 'http':
        await executeHttpAction(action.config as HttpActionConfig, triggerData);
        break;
      case 'telegram':
        await executeTelegramAction(action.config as TelegramActionConfig, triggerData);
        break;
      case 'database':
        await executeDatabaseAction(action.config as DatabaseActionConfig, triggerData);
        break;
      case 'transform':
        await executeTransformAction(action.config as TransformActionConfig, triggerData);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    addLog(execution, 'info', `Action ${action.type} completed successfully`, action.id);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog(execution, 'error', `Action ${action.type} failed: ${errorMessage}`, action.id);
    throw error;
  }
}

async function executeEmailAction(config: EmailActionConfig, data: Record<string, unknown>): Promise<void> {
  if (!resend) {
    throw new Error('Resend API key not configured. Please add RESEND_API_KEY to your environment variables.');
  }

  try {
    // Для тестирования используем email из формы пользователя, если он не указан в действии
    const recipientEmail = config.to || (typeof data.email === 'string' ? data.email : 'test@example.com');

    const emailData = {
      from: 'onboarding@resend.dev', // Всегда указываем from для Resend
      to: recipientEmail,
      subject: config.subject || `Сообщение от ${typeof data.name === 'string' ? data.name : 'Workflow'}`,
      text: config.body || (typeof data.message === 'string' ? data.message : 'Тестовое сообщение'),
    };

    // Если пользователь указал свой from, используем его
    if (config.from && config.from.trim()) {
      emailData.from = config.from.trim();
    }

    const result = await resend.emails.send(emailData);

    if (result.error) {
      throw new Error(`Email sending failed: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Email sending error:', error);

    // Преобразуем ошибку Resend в более понятную
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('You can only send testing emails to your own email address')) {
      throw new Error(`Email можно отправлять только на верифицированные адреса. Для тестирования используйте свой email адрес (${process.env.FROM_EMAIL || 'укажите FROM_EMAIL в .env'}).`);
    }

    throw error;
  }
}

async function executeHttpAction(config: HttpActionConfig, data: Record<string, unknown>): Promise<void> {
  const response = await axios({
    method: config.method,
    url: config.url,
    headers: config.headers,
    data: config.body,
    timeout: config.timeout || 30000,
  });

  // Сохраняем результат в data для следующих действий
  data.httpResponse = response.data;
}

async function executeTelegramAction(config: TelegramActionConfig, data: Record<string, unknown>): Promise<void> {
  if (!telegramBot) {
    throw new Error('Telegram bot token not configured. Please add TELEGRAM_BOT_TOKEN to your environment variables.');
  }

  try {
    // Захардкоженный Chat ID для группы
    const chatId = '-1003520125389';

    const message = config.message ||
      (typeof data.message === 'string' ? data.message : undefined) ||
      `Сообщение от ${typeof data.name === 'string' ? data.name : 'Workflow'}`;

    console.log(`Sending Telegram message to chat ${chatId}:`, message);

    await telegramBot.telegram.sendMessage(
      chatId,
      message,
      { parse_mode: config.parseMode }
    );

    console.log('Telegram message sent successfully');
  } catch (error) {
    console.error('Telegram sending error:', error);
    throw error;
  }
}

async function executeDatabaseAction(config: DatabaseActionConfig, data: Record<string, unknown>): Promise<void> {
  console.log('🔍 Database operation starting:', {
    operation: config.operation,
    table: config.table,
    data: config.data,
    where: config.where
  });

  const { operation, table, data: actionData, where } = config;

  if (!table || !table.trim()) {
    throw new Error('Table name is required for database operations');
  }

  let client;
  try {
    console.log('🔌 Connecting to database...');
    client = await dbPool.connect();
    console.log('✅ Database connection established');

    switch (operation) {
      case 'select': {
        console.log('🔍 Starting SELECT operation');
        let query = `SELECT * FROM ${table}`;
        const values: unknown[] = [];
        let paramIndex = 1;

        if (where && typeof where === 'object') {
          const conditions = Object.entries(where)
            .map(([key, value]) => {
              values.push(value);
              return `${key} = $${paramIndex++}`;
            })
            .join(' AND ');

          if (conditions) {
            query += ` WHERE ${conditions}`;
          }
        }

        console.log('🔧 Executing SELECT query:', query);
        console.log('📊 WHERE values:', values);

        const result = await client.query(query, values);

        console.log('✅ SELECT completed:', {
          foundRows: result.rowCount,
          returnedData: result.rows
        });

        data.dbResult = {
          operation: 'select',
          rows: result.rows,
          rowCount: result.rowCount
        };
        break;
      }

      case 'insert': {
        console.log('📥 Starting INSERT operation');
        if (!actionData || typeof actionData !== 'object') {
          console.error('❌ No data provided for INSERT');
          throw new Error('Data object is required for INSERT operation');
        }

        const columns = Object.keys(actionData);
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const values = Object.values(actionData);

        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

        console.log('🔧 Executing INSERT query:', query);
        console.log('📊 Values:', values);

        const result = await client.query(query, values);

        console.log('✅ INSERT completed:', {
          affectedRows: result.rowCount,
          returnedRows: result.rows.length,
          firstRow: result.rows[0]
        });

        data.dbResult = {
          operation: 'insert',
          rows: result.rows,
          rowCount: result.rowCount,
          insertId: result.rows[0]?.id || null
        };
        break;
      }

      case 'update': {
        console.log('📝 Starting UPDATE operation');
        if (!actionData || typeof actionData !== 'object') {
          console.error('❌ No data provided for UPDATE');
          throw new Error('Data object is required for UPDATE operation');
        }

        if (!where || typeof where !== 'object') {
          console.error('❌ No WHERE conditions for UPDATE');
          throw new Error('WHERE conditions are required for UPDATE operation');
        }

        const setColumns = Object.keys(actionData);
        const setPlaceholders = setColumns.map((col, index) => `${col} = $${index + 1}`);

        const whereColumns = Object.keys(where);
        const whereConditions = whereColumns.map((col, index) => `${col} = $${setColumns.length + index + 1}`);

        const values = [...Object.values(actionData), ...Object.values(where)];

        const query = `UPDATE ${table} SET ${setPlaceholders.join(', ')} WHERE ${whereConditions.join(' AND ')} RETURNING *`;

        console.log('🔧 Executing UPDATE query:', query);
        console.log('📊 SET values:', Object.values(actionData));
        console.log('🔍 WHERE values:', Object.values(where));

        const result = await client.query(query, values);

        console.log('✅ UPDATE completed:', {
          affectedRows: result.rowCount,
          updatedRows: result.rows.length
        });

        data.dbResult = {
          operation: 'update',
          rows: result.rows,
          rowCount: result.rowCount
        };
        break;
      }

      case 'delete': {
        console.log('🗑️ Starting DELETE operation');
        if (!where || typeof where !== 'object') {
          console.error('❌ No WHERE conditions for DELETE');
          throw new Error('WHERE conditions are required for DELETE operation');
        }

        const whereColumns = Object.keys(where);
        const whereConditions = whereColumns.map((col, index) => `${col} = $${index + 1}`);
        const values = Object.values(where);

        const query = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')} RETURNING *`;

        console.log('🔧 Executing DELETE query:', query);
        console.log('🔍 WHERE values:', values);

        const result = await client.query(query, values);

        console.log('✅ DELETE completed:', {
          affectedRows: result.rowCount,
          deletedRows: result.rows.length
        });

        data.dbResult = {
          operation: 'delete',
          rows: result.rows,
          rowCount: result.rowCount
        };
        break;
      }

      default:
        throw new Error(`Unsupported database operation: ${operation}`);
    }

    console.log('🎉 Database operation completed successfully:', data.dbResult);

  } catch (error) {
    console.error('💥 Database operation failed:', error);
    console.error('Error details:', {
      operation,
      table,
      data: actionData,
      where,
      error: error instanceof Error ? error.message : String(error)
    });

    // Преобразуем технические ошибки в понятные
    let userFriendlyError = error instanceof Error ? error.message : String(error);

    if (userFriendlyError.includes('duplicate key value violates unique constraint')) {
      if (userFriendlyError.includes('email_key')) {
        userFriendlyError = 'Пользователь с таким email уже существует';
      } else {
        userFriendlyError = 'Запись с такими данными уже существует';
      }
    } else if (userFriendlyError.includes('null value in column')) {
      userFriendlyError = 'Не заполнены обязательные поля';
    } else if (userFriendlyError.includes('invalid input syntax')) {
      userFriendlyError = 'Неверный формат данных';
    }

    throw new Error(userFriendlyError);
  } finally {
    if (client) {
      console.log('🔌 Releasing database connection');
      client.release();
    }
  }
}

async function executeTransformAction(config: TransformActionConfig, data: Record<string, unknown>): Promise<void> {
  // Простая трансформация данных с помощью Function constructor
  // В продакшене использовать более безопасный подход
  try {
    const transformFunction = new Function('data', `return ${config.transformation}`);
    const result = transformFunction(data);
    data[config.output] = result;
  } catch (error) {
    throw new Error(`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function addLog(
  execution: WorkflowExecution,
  level: 'info' | 'warning' | 'error',
  message: string,
  actionId?: string
): void {
  const log: WorkflowExecutionLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    message,
    actionId,
  };

  execution.logs.push(log);
}

// CRUD операции для workflow
export function createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow {
  const newWorkflow: Workflow = {
    ...workflow,
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflows.push(newWorkflow);
  saveWorkflows(workflows);
  return newWorkflow;
}

export function getWorkflows(): Workflow[] {
  // Сортируем по дате создания в обратном порядке (новые первыми)
  return workflows.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime; // Новые первыми
  });
}

export function getWorkflow(id: string): Workflow | undefined {
  return workflows.find(w => w.id === id);
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
  const index = workflows.findIndex(w => w.id === id);
  if (index === -1) return null;

  workflows[index] = { ...workflows[index], ...updates, updatedAt: new Date() };
  saveWorkflows(workflows);
  return workflows[index];
}

export function deleteWorkflow(id: string): boolean {
  const index = workflows.findIndex(w => w.id === id);
  if (index === -1) return false;

  workflows.splice(index, 1);
  saveWorkflows(workflows);
  return true;
}

// Операции с executions
export function getExecutions(workflowId?: string): WorkflowExecution[] {
  // Читаем актуальные данные из файла при каждом запросе
  const executions = loadExecutions();

  const filteredExecutions = workflowId
    ? executions.filter(e => e.workflowId === workflowId)
    : executions;

  // Сортируем по дате начала выполнения в обратном порядке (новые сначала)
  return filteredExecutions.sort((a, b) => {
    const aTime = new Date(a.startedAt).getTime();
    const bTime = new Date(b.startedAt).getTime();
    return bTime - aTime; // Новые первыми
  });
}

export function getExecution(id: string): WorkflowExecution | undefined {
  const executions = loadExecutions();
  return executions.find((e) => e.id === id);
}
