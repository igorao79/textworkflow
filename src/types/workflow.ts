export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface WorkflowTrigger {
  id: string;
  type: 'webhook' | 'cron' | 'email';
  config: WebhookTriggerConfig | CronTriggerConfig | EmailTriggerConfig;
}

export interface WebhookTriggerConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
}

export interface CronTriggerConfig {
  schedule: string; // cron expression
  timezone?: string;
}

export interface EmailTriggerConfig {
  from?: string;
  subject?: string;
  body?: string;
}

export interface WorkflowAction {
  id: string;
  type: 'http' | 'email' | 'telegram' | 'database' | 'transform';
  config: HttpActionConfig | EmailActionConfig | TelegramActionConfig | DatabaseActionConfig | TransformActionConfig;
  position: { x: number; y: number };
}

export interface HttpActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface EmailActionConfig {
  to: string;
  subject: string;
  body: string;
  from?: string;
  templateId?: string;
}

export interface TelegramActionConfig {
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface DatabaseActionConfig {
  operation: 'insert' | 'update' | 'delete' | 'select';
  table: string;
  data?: any;
  where?: any;
}

export interface TransformActionConfig {
  input: string; // JSON path or variable
  transformation: string; // JavaScript code
  output: string; // variable name to store result
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  logs: WorkflowExecutionLog[];
  error?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  actionId?: string;
  data?: any;
}

export interface WorkflowFormData {
  name: string;
  email: string;
  telegramUsername: string;
  message: string;
}
