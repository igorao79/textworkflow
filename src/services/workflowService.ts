import { Resend } from 'resend';
import axios from 'axios';
import { Telegraf } from 'telegraf';
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
import { Job } from 'bull';

// Инициализация сервисов (только если есть API ключи)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const telegramBot = process.env.TELEGRAM_BOT_TOKEN ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN) : null;

// Папка для хранения данных
const DATA_DIR = path.join(process.cwd(), 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

// Создаем папку data если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Функции для загрузки/сохранения данных
function loadWorkflows(): Workflow[] {
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      const data = fs.readFileSync(WORKFLOWS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Преобразуем даты обратно в объекты Date
      return parsed.map((workflow: any) => ({
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
      return parsed.map((execution: any) => ({
        ...execution,
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
        logs: execution.logs.map((log: any) => ({
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

// Хранилище workflow с загрузкой из файлов
let workflows: Workflow[] = loadWorkflows();
let executions: WorkflowExecution[] = loadExecutions();

export async function executeWorkflow(
  workflowId: string,
  triggerData: any
): Promise<WorkflowExecution> {
  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) {
    console.error(`Workflow ${workflowId} not found`);
    throw new Error(`Workflow ${workflowId} not found`);
  }

  const execution: WorkflowExecution = {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workflowId,
    status: 'running',
    startedAt: new Date(),
    logs: []
  };

  executions.push(execution);
  saveExecutions(executions);

  try {
    // Выполняем действия workflow последовательно
    for (const action of workflow.actions) {
      await executeAction(action, triggerData, execution);
    }

    execution.status = 'completed';
    execution.completedAt = new Date();

    // Логируем завершение
    addLog(execution, 'info', 'Workflow execution completed successfully');
    saveExecutions(executions);

  } catch (error) {
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : 'Unknown error';
    execution.completedAt = new Date();

    addLog(execution, 'error', `Workflow execution failed: ${execution.error}`);
    saveExecutions(executions);

    console.error(`Workflow ${workflowId} failed:`, error);

    throw error;
  }

  return execution;
}

async function executeAction(
  action: WorkflowAction,
  triggerData: any,
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

async function executeEmailAction(config: EmailActionConfig, data: any): Promise<void> {
  if (!resend) {
    throw new Error('Resend API key not configured. Please add RESEND_API_KEY to your environment variables.');
  }

  try {
    // Для тестирования используем email из формы пользователя, если он не указан в действии
    const recipientEmail = config.to || data.email || 'test@example.com';

    const emailData: any = {
      from: 'onboarding@resend.dev', // Всегда указываем from для Resend
      to: recipientEmail,
      subject: config.subject || `Сообщение от ${data.name || 'Workflow'}`,
      text: config.body || data.message || 'Тестовое сообщение',
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

async function executeHttpAction(config: HttpActionConfig, data: any): Promise<void> {
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

async function executeTelegramAction(config: TelegramActionConfig, data: any): Promise<void> {
  if (!telegramBot) {
    throw new Error('Telegram bot token not configured. Please add TELEGRAM_BOT_TOKEN to your environment variables.');
  }

  try {
    // Захардкоженный Chat ID для группы
    const chatId = '-1003520125389';

    const message = config.message || data.message || `Сообщение от ${data.name || 'Workflow'}`;

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

async function executeDatabaseAction(config: DatabaseActionConfig, data: any): Promise<void> {
  // Простая имитация работы с БД (в продакшене использовать реальную БД)

  // Имитация результата
  data.dbResult = { affectedRows: 1, insertId: Date.now() };
}

async function executeTransformAction(config: TransformActionConfig, data: any): Promise<void> {
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
  return workflows;
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
  if (workflowId) {
    return executions.filter(e => e.workflowId === workflowId);
  }
  return executions;
}

export function getExecution(id: string): WorkflowExecution | undefined {
  return executions.find(e => e.id === id);
}
