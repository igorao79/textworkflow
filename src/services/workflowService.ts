import { Resend } from 'resend';
import axios from 'axios';
import { Telegraf } from 'telegraf';
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

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>; // JSONB can contain any structure
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ExecutionRow {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at: Date | null;
  error: string | null;
  result: Record<string, unknown> | null;
}

// Инициализация сервисов (только если есть API ключи)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const telegramBot = process.env.TELEGRAM_BOT_TOKEN ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN) : null;

// Подключение к PostgreSQL через динамический импорт из lib/db

// Все данные хранятся только в внешних сервисах (PostgreSQL + Redis)
// Никаких локальных файлов или in-memory структур

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
async function loadWorkflows(): Promise<Workflow[]> {
  try {
    console.log('🔍 loadWorkflows: Starting to load workflows from database');
    const { sql } = await import('../lib/db');
    const workflowsData = await sql(`
      SELECT
        id,
        name,
        description,
        trigger_type,
        trigger_config,
        actions,
        is_active,
        created_at,
        updated_at
      FROM workflows
      ORDER BY created_at DESC
    `);
    console.log(`🔍 loadWorkflows: Found ${workflowsData.length} workflows in database`);

    const workflows: Workflow[] = (workflowsData as WorkflowRow[]).map((row: WorkflowRow) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      trigger: {
        id: `${row.id}-trigger`,
        type: row.trigger_type as 'webhook' | 'cron' | 'email',
        config: row.trigger_config
      },
      actions: row.actions,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    console.log(`✅ Loaded ${workflows.length} workflows from database`);
    return workflows;
  } catch (error) {
    console.error('❌ Failed to load workflows from database:', error);
    // Fallback: return empty array if database is not available
    console.log('🔄 Falling back to empty workflows array');
    return [];
  }
}


async function loadExecutions(includeLogs = false): Promise<WorkflowExecution[]> {
  console.log(`🔍 loadExecutions called with includeLogs: ${includeLogs}`);
  try {
    // Сначала пробуем загрузить из БД
    try {
      console.log('🔍 loadExecutions: trying to load from database');
      const { sql } = await import('../lib/db');
      const executionsData = await sql(`
        SELECT
          id,
          workflow_id,
          status,
          started_at,
          completed_at,
          error,
          result,
          created_at,
          updated_at
        FROM workflow_executions
        ORDER BY started_at DESC
      `);

      const executions: WorkflowExecution[] = [];

      // Загружаем логи только если запрошено (для оптимизации dashboard)
      let logsByExecution = new Map<string, WorkflowExecutionLog[]>();

      if (includeLogs && (executionsData as ExecutionRow[]).length > 0) {
        const executionIds = (executionsData as ExecutionRow[]).map((exec: ExecutionRow) => exec.id);
        const logsData = await sql(`
          SELECT
            execution_id,
            id,
            timestamp,
            level,
            message,
            action_id,
            data
          FROM workflow_execution_logs
          WHERE execution_id = ANY($1)
          ORDER BY execution_id, timestamp ASC
        `, [executionIds]);

        // Группируем логи по execution_id
        logsByExecution = new Map<string, WorkflowExecutionLog[]>();
        for (const log of logsData) {
          const logs = logsByExecution.get(log.execution_id) || [];
          logs.push({
            id: log.id,
            timestamp: new Date(log.timestamp),
            level: log.level as 'info' | 'warning' | 'error',
            message: log.message,
            actionId: log.action_id || undefined,
            data: log.data
          });
          logsByExecution.set(log.execution_id, logs);
        }
      }

      for (const execData of executionsData as ExecutionRow[]) {
        executions.push({
          id: execData.id,
          workflowId: execData.workflow_id,
          status: execData.status,
          startedAt: new Date(execData.started_at),
          completedAt: execData.completed_at ? new Date(execData.completed_at) : undefined,
          error: execData.error || undefined,
          result: execData.result || undefined,
          logs: includeLogs ? (logsByExecution.get(execData.id) || []) : [], // Логи только если запрошены
        });
      }

      console.log(`✅ Loaded ${executions.length} executions from database`);
      return executions;
    } catch (dbError) {
      console.error('❌ Failed to load executions from database:', dbError);
      console.log('🔄 Falling back to empty executions array');
      return [];
    }
  } catch (error) {
    console.error('Error loading executions:', error);
  }
  return [];
}

async function saveExecutions(executions: WorkflowExecution[]): Promise<void> {
  try {
    // Сначала пробуем сохранить в БД
    try {
      const { sql } = await import('../lib/db');

      // Сохраняем executions
      for (const execution of executions) {
        await sql(`
          INSERT INTO workflow_executions (
            id, workflow_id, status, started_at, completed_at, error, result
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            completed_at = EXCLUDED.completed_at,
            error = EXCLUDED.error,
            result = EXCLUDED.result,
            updated_at = CURRENT_TIMESTAMP
        `, [
          execution.id,
          execution.workflowId,
          execution.status,
          execution.startedAt.toISOString(),
          execution.completedAt?.toISOString() || null,
          execution.error || null,
          execution.result ? JSON.stringify(execution.result) : null
        ]);

        // Сохраняем логи
        for (const log of execution.logs) {
          await sql(`
            INSERT INTO workflow_execution_logs (
              id, execution_id, timestamp, level, message, action_id, data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [
            log.id,
            execution.id,
            log.timestamp.toISOString(),
            log.level,
            log.message,
            log.actionId || null,
            log.data ? JSON.stringify(log.data) : null
          ]);
        }
      }

      console.log(`✅ Saved ${executions.length} executions to database`);
      return;
    } catch (dbError) {
      console.error('❌ Failed to save executions to database:', dbError);
      console.log('🔄 Continuing despite database save error');
      // Don't throw error - allow execution to continue
    }
  } catch (error) {
    console.error('Error saving executions:', error);
    throw error;
  }
}

// updateExecutionInFile удалена - теперь используется saveExecutionResults

// Сохраняет один execution в БД
export async function saveExecutionResult(execution: WorkflowExecution): Promise<void> {
  await saveExecutions([execution]);
}

// Хранилище workflow с загрузкой из файлов
// Данные всегда загружаются из БД при каждом запросе

export async function executeWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<WorkflowExecution> {
  console.log(`🔄 WorkflowService: executeWorkflow called for ${workflowId} with trigger:`, triggerData);

  const workflow = await getWorkflow(workflowId);
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

  // Сохраняем новый execution в БД
  await saveExecutionResult(execution);

  try {
    console.log(`🔄 Starting execution of ${workflow.actions.length} actions...`);

    // Выполняем действия workflow последовательно
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      console.log(`🎯 Executing action ${i + 1}/${workflow.actions.length}: ${action.type}`);
      await executeAction(action, triggerData, execution);
      console.log(`✅ Action ${i + 1} completed: ${action.type}`);
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.result = triggerData; // Сохраняем результаты выполнения

    console.log(`🎉 Workflow execution completed successfully!`);

    // Логируем завершение и обновляем в БД/файле
    addLog(execution, 'info', 'Workflow execution completed successfully');
    await saveExecutionResult(execution);

  } catch (error: unknown) {
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : String(error);
    execution.completedAt = new Date();

    addLog(execution, 'error', `Workflow execution failed: ${execution.error}`);
    await saveExecutionResult(execution);

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
  console.log(`⚙️ Starting action: ${action.type} (ID: ${action.id})`);
  try {
    addLog(execution, 'info', `Executing action: ${action.type}`, action.id);

    switch (action.type) {
      case 'email':
        console.log(`📧 Executing email action to: ${(action.config as EmailActionConfig).to}`);
        await executeEmailAction(action.config as EmailActionConfig, triggerData);
        break;
      case 'http':
        console.log(`🌐 Executing HTTP action to: ${(action.config as HttpActionConfig).url}`);
        await executeHttpAction(action.config as HttpActionConfig, triggerData);
        break;
      case 'telegram':
        console.log(`📱 Executing Telegram action`);
        await executeTelegramAction(action.config as TelegramActionConfig, triggerData);
        break;
      case 'database':
        console.log(`💾 Executing database action on table: ${(action.config as DatabaseActionConfig).table}`);
        await executeDatabaseAction(action.config as DatabaseActionConfig, triggerData);
        break;
      case 'transform':
        console.log(`🔄 Executing transform action`);
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

  try {
    const { sql } = await import('../lib/db');

    console.log('🔌 Database connection established');

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

        const result: Record<string, unknown>[] = await sql(query, values);

        console.log('✅ SELECT completed:', {
          foundRows: result.length,
          returnedData: result
        });

        data.dbResult = {
          operation: 'select',
          rows: result,
          rowCount: result.length
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

        const result: Record<string, unknown>[] = await sql(query, values);

        console.log('✅ INSERT completed:', {
          affectedRows: result.length,
          returnedRows: result.length,
          firstRow: result[0]
        });

        data.dbResult = {
          operation: 'insert',
          rows: result,
          rowCount: result.length,
          insertId: result[0]?.id || null
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

        const result = await sql(query, values);

        console.log('✅ UPDATE completed:', {
          affectedRows: result.length,
          updatedRows: result.length
        });

        data.dbResult = {
          operation: 'update',
          rows: result,
          rowCount: result.length
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

        const result = await sql(query, values);

        console.log('✅ DELETE completed:', {
          affectedRows: result.length,
          deletedRows: result.length
        });

        data.dbResult = {
          operation: 'delete',
          rows: result,
          rowCount: result.length
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
  }
}

async function executeTransformAction(config: TransformActionConfig, fullData: Record<string, unknown>): Promise<void> {
  // Простая трансформация данных с помощью Function constructor
  // В продакшене использовать более безопасный подход
  try {
    // Извлекаем значение по пути config.input
    let inputValue: unknown;

    if (config.input === '.' || config.input === 'data' || !config.input.trim()) {
      // Используем весь объект данных
      inputValue = fullData;
    } else if (config.input.startsWith('data.')) {
      // Простой путь вида data.email, data.name и т.д.
      const path = config.input.replace('data.', '');
      inputValue = fullData[path];
    } else {
      // Пытаемся найти значение по ключу
      inputValue = fullData[config.input];
    }

    // Добавляем return для выражений, которые должны вернуть результат
    const transformCode = config.transformation.trim().startsWith('return ')
      ? config.transformation
      : `return ${config.transformation}`;

    const transformFunction = new Function('data', transformCode);
    const result = transformFunction(inputValue);
    fullData[config.output] = result;
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
export async function createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
  console.log('🔧 createWorkflow called with:', {
    name: workflow.name,
    trigger: workflow.trigger?.type,
    actionsCount: workflow.actions?.length,
    hasIsActive: 'isActive' in workflow
  });

  const newWorkflow: Workflow = {
    ...workflow,
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('🔧 Created workflow with id:', newWorkflow.id);

  try {
    const { sql } = await import('../lib/db');

    await sql(`
      INSERT INTO workflows (
        id, name, description,
        trigger_type, trigger_config,
        actions, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      newWorkflow.id,
      newWorkflow.name,
      newWorkflow.description || null,
      newWorkflow.trigger.type,
      JSON.stringify(newWorkflow.trigger.config),
      JSON.stringify(newWorkflow.actions),
      newWorkflow.isActive,
      newWorkflow.createdAt.toISOString(),
      newWorkflow.updatedAt.toISOString()
    ]);

    console.log('✅ Workflow saved to database:', { id: newWorkflow.id, name: newWorkflow.name });
    return newWorkflow;

  } catch (dbError) {
    console.error('❌ Database error in createWorkflow:', dbError);
    throw new Error(`Failed to save workflow to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
  }
}

export async function getWorkflows(): Promise<Workflow[]> {
  // Всегда загружаем свежие данные из БД
  const workflows = await loadWorkflows();

  // Сортируем по дате создания в обратном порядке (новые первыми)
  return workflows.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime; // Новые первыми
  });
}

export async function getWorkflow(id: string): Promise<Workflow | undefined> {
  console.log(`🔍 getWorkflow: Looking for workflow with id: ${id}`);
  const workflows = await getWorkflows();
  const workflow = workflows.find(w => w.id === id);
  console.log(`🔍 getWorkflow: ${workflow ? 'Found' : 'Not found'} workflow with id: ${id}`);
  return workflow;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
  try {
    const { sql } = await import('../lib/db');

    // Сначала получаем текущий воркфлоу
    const currentWorkflow = await getWorkflow(id);
    if (!currentWorkflow) return null;

    const updatedWorkflow: Workflow = {
      ...currentWorkflow,
      ...updates,
      updatedAt: new Date()
    };

    // Обновляем в БД
    await sql(`
      UPDATE workflows SET
        name = $2,
        description = $3,
        trigger_type = $4,
        trigger_config = $5,
        actions = $6,
        is_active = $7,
        updated_at = $8
      WHERE id = $1
    `, [
      id,
      updatedWorkflow.name,
      updatedWorkflow.description || null,
      updatedWorkflow.trigger.type,
      JSON.stringify(updatedWorkflow.trigger.config),
      JSON.stringify(updatedWorkflow.actions),
      updatedWorkflow.isActive,
      updatedWorkflow.updatedAt.toISOString()
    ]);

    console.log('✅ Workflow updated in database:', { id, name: updatedWorkflow.name });
    return updatedWorkflow;

  } catch (dbError) {
    console.error('❌ Database error in updateWorkflow:', dbError);
    throw new Error(`Failed to update workflow in database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
  }
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  try {
    const { sql } = await import('../lib/db');

    // Проверяем, существует ли воркфлоу
    const existingWorkflow = await getWorkflow(id);
    if (!existingWorkflow) return false;

    // Удаляем из БД
    await sql('DELETE FROM workflows WHERE id = $1', [id]);
    console.log(`🗑️ Deleted workflow ${id} from database`);
    return true;

  } catch (dbError) {
    console.error('❌ Database error in deleteWorkflow:', dbError);
    throw new Error(`Failed to delete workflow from database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
  }
}

// Операции с executions
export async function getExecutions(workflowId?: string, includeLogs = false): Promise<WorkflowExecution[]> {
  console.log(`🔍 getExecutions called with workflowId: ${workflowId}, includeLogs: ${includeLogs}`);
  // Читаем актуальные данные из БД/файла при каждом запросе
  const executions = await loadExecutions(includeLogs);
  console.log(`🔍 getExecutions: loaded ${executions.length} executions from database`);

  const filteredExecutions = workflowId
    ? executions.filter(e => e.workflowId === workflowId)
    : executions;

  console.log(`🔍 getExecutions: returning ${filteredExecutions.length} filtered executions`);
  return filteredExecutions;

  // Сортируем по дате начала выполнения в обратном порядке (новые сначала)
  return filteredExecutions.sort((a, b) => {
    const aTime = new Date(a.startedAt).getTime();
    const bTime = new Date(b.startedAt).getTime();
    return bTime - aTime; // Новые первыми
  });
}

export async function getExecution(id: string): Promise<WorkflowExecution | undefined> {
  const executions = await loadExecutions(true); // Загружаем логи для детального просмотра
  return executions.find((e) => e.id === id);
}
