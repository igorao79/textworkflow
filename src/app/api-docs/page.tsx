'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Импорт стилей Swagger UI
import 'swagger-ui-react/swagger-ui.css';

// Типы для Swagger UI (упрощенные, так как не используются)
interface SwaggerUIModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Динамический импорт Swagger UI для избежания проблем с SSR
const SwaggerUIModule = dynamic(() =>
  import('swagger-ui-react').then(module => module),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Загрузка документации...</span>
    </div>
  }
);

export default function ApiDocsPage() {
  // Отключаем React Strict Mode для этой страницы, чтобы избежать предупреждений Swagger UI
  React.useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('UNSAFE_componentWillReceiveProps')) {
        return; // Игнорируем предупреждения Swagger UI
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Добавляем цветные стили для вкладок через JavaScript
  React.useEffect(() => {
    const addTabColors = () => {
      // Находим все вкладки Swagger UI
      const tabs = document.querySelectorAll('.swagger-ui button[role="tab"], .swagger-ui .tab, .swagger-ui [role="tab"]');

      tabs.forEach((tab) => {
        const tabElement = tab as HTMLElement;
        const textContent = tabElement.textContent?.toLowerCase() || '';

        // Убираем старые классы
        tabElement.classList.remove('tab-success', 'tab-request', 'tab-params', 'tab-headers', 'tab-schema', 'tab-error');

        // Добавляем классы на основе содержимого
        if (textContent.includes('200') || textContent.includes('201') || textContent.includes('success')) {
          tabElement.classList.add('tab-success');
        } else if (textContent.includes('400') || textContent.includes('404') || textContent.includes('500') || textContent.includes('error')) {
          tabElement.classList.add('tab-error');
        } else if (textContent.includes('request') || textContent.includes('body')) {
          tabElement.classList.add('tab-request');
        } else if (textContent.includes('parameters') || textContent.includes('params')) {
          tabElement.classList.add('tab-params');
        } else if (textContent.includes('headers') || textContent.includes('header')) {
          tabElement.classList.add('tab-headers');
        } else if (textContent.includes('schema') || textContent.includes('model')) {
          tabElement.classList.add('tab-schema');
        }
      });
    };

    // Запускаем сразу и каждые 2 секунды (для динамически загружаемого контента)
    addTabColors();
    const interval = setInterval(addTabColors, 2000);

    return () => clearInterval(interval);
  }, []);
  // Создаем OpenAPI спецификацию статически
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'FlowForge API',
      version: '1.0.0',
      description: 'API для управления workflow и их выполнениями'
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-domain.com'
          : 'http://localhost:3000',
        description: 'API сервер'
      }
    ],
    components: {
      schemas: {
        Workflow: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            trigger: { $ref: '#/components/schemas/WorkflowTrigger' },
            actions: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkflowAction' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' }
          }
        },
        WorkflowTrigger: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['webhook', 'cron', 'email']
            },
            config: { type: 'object' }
          }
        },
        WorkflowAction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['http', 'email', 'telegram', 'database', 'transform']
            },
            config: { type: 'object' },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' }
              }
            }
          }
        },
        WorkflowExecution: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            workflowId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed']
            },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            logs: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkflowExecutionLog' }
            },
            error: { type: 'string' }
          }
        },
        WorkflowExecutionLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            level: {
              type: 'string',
              enum: ['info', 'warning', 'error']
            },
            message: { type: 'string' },
            actionId: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    paths: {
      '/api/workflows': {
        get: {
          summary: 'Получить список всех workflows',
          responses: {
            200: {
              description: 'Список workflows',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Workflow' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Создать новый workflow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    trigger: { $ref: '#/components/schemas/WorkflowTrigger' },
                    actions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkflowAction' }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Workflow создан',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Workflow' }
                }
              }
            }
          }
        }
      },
      '/api/workflows/{id}': {
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        get: {
          summary: 'Получить workflow по ID',
          responses: {
            200: {
              description: 'Workflow найден',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Workflow' }
                }
              }
            }
          }
        },
        put: {
          summary: 'Обновить workflow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Workflow' }
              }
            }
          },
          responses: {
            200: {
              description: 'Workflow обновлен',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Workflow' }
                }
              }
            }
          }
        },
        delete: {
          summary: 'Удалить workflow',
          responses: {
            204: { description: 'Workflow удален' }
          }
        }
      },
      '/api/executions': {
        get: {
          summary: 'Получить список выполнений workflow',
          parameters: [
            {
              name: 'workflowId',
              in: 'query',
              schema: { type: 'string' },
              description: 'Фильтр по ID workflow'
            }
          ],
          responses: {
            200: {
              description: 'Список выполнений',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/WorkflowExecution' }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Запустить выполнение workflow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workflowId: { type: 'string' },
                    triggerData: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Выполнение добавлено в очередь',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      jobId: { type: 'string' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/webhooks/{workflowId}': {
        parameters: [
          {
            name: 'workflowId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        post: {
          summary: 'Webhook endpoint для запуска workflow',
          requestBody: {
            description: 'Данные webhook',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          responses: {
            200: {
              description: 'Webhook принят, workflow запущен',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      jobId: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/queue/stats': {
        get: {
          summary: 'Получить статистику очереди задач',
          responses: {
            200: {
              description: 'Статистика очереди',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      waiting: { type: 'number', description: 'Задач в ожидании' },
                      active: { type: 'number', description: 'Выполняющихся задач' },
                      completedCount: { type: 'number', description: 'Завершенных задач' },
                      failedCount: { type: 'number', description: 'Неудачных задач' },
                      paused: { type: 'boolean', description: 'Очередь приостановлена' },
                      completed: { type: 'number', description: 'Всего завершенных' },
                      failed: { type: 'number', description: 'Всего неудачных' },
                      retries: { type: 'number', description: 'Количество повторных попыток' },
                      totalJobs: { type: 'number', description: 'Общее количество задач' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/queue/pause': {
        post: {
          summary: 'Управление паузой очереди',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: {
                      type: 'string',
                      enum: ['pause', 'resume'],
                      description: 'Действие: pause или resume'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Действие выполнено',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const spec = openApiSpec;

  return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
            {/* Hero секция с градиентом */}
            <div className="mb-12 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
                    FlowForge API
          </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Мощный и интуитивный REST API для автоматизации бизнес-процессов.
                    Создавайте, управляйте и мониторьте workflows с помощью современных технологий.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Next.js 16</span>
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">TypeScript</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">REST API</span>
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">Swagger UI</span>
                  </div>
                </div>
              </div>
        </div>

        <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50 min-h-[600px] overflow-hidden relative">
          {/* Декоративные элементы */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
          <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-accent/5 to-primary/5 rounded-full blur-lg"></div>
          <style jsx global>{`
            /* Кастомные стили для Swagger UI с !important для переопределения */
            .swagger-ui .topbar { display: none !important; }

            /* Базовые стили для вкладок */
            .swagger-ui .tab,
            .swagger-ui [role="tab"],
            .swagger-ui .tabs > div,
            .swagger-ui .tab-header,
            .swagger-ui button[role="tab"] {
              margin-right: 4px !important;
              cursor: pointer !important;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
              overflow: hidden !important;
              backdrop-filter: blur(10px) !important;
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              padding: 8px 12px !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              min-height: 36px !important;
              border: 2px solid transparent !important;
            }

            /* Цветные стили для разных типов вкладок */
            .swagger-ui .tab-success,
            .swagger-ui .tab.tab-success,
            .swagger-ui [role="tab"].tab-success,
            .swagger-ui button[role="tab"].tab-success {
              background: linear-gradient(135deg, #10b981, #059669) !important;
              color: white !important;
              border-color: #10b981 !important;
            }

            .swagger-ui .tab-success *,
            .swagger-ui .tab.tab-success *,
            .swagger-ui [role="tab"].tab-success *,
            .swagger-ui button[role="tab"].tab-success * {
              color: white !important;
            }

            .swagger-ui .tab-error,
            .swagger-ui .tab.tab-error,
            .swagger-ui [role="tab"].tab-error,
            .swagger-ui button[role="tab"].tab-error {
              background: linear-gradient(135deg, #ef4444, #dc2626) !important;
              color: white !important;
              border-color: #ef4444 !important;
            }

            .swagger-ui .tab-error *,
            .swagger-ui .tab.tab-error *,
            .swagger-ui [role="tab"].tab-error *,
            .swagger-ui button[role="tab"].tab-error * {
              color: white !important;
            }

            .swagger-ui .tab-request,
            .swagger-ui .tab.tab-request,
            .swagger-ui [role="tab"].tab-request,
            .swagger-ui button[role="tab"].tab-request {
              background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
              color: white !important;
              border-color: #3b82f6 !important;
            }

            .swagger-ui .tab-request *,
            .swagger-ui .tab.tab-request *,
            .swagger-ui [role="tab"].tab-request *,
            .swagger-ui button[role="tab"].tab-request * {
              color: white !important;
            }

            .swagger-ui .tab-params,
            .swagger-ui .tab.tab-params,
            .swagger-ui [role="tab"].tab-params,
            .swagger-ui button[role="tab"].tab-params {
              background: linear-gradient(135deg, #f59e0b, #d97706) !important;
              color: white !important;
              border-color: #f59e0b !important;
            }

            .swagger-ui .tab-params *,
            .swagger-ui .tab.tab-params *,
            .swagger-ui [role="tab"].tab-params *,
            .swagger-ui button[role="tab"].tab-params * {
              color: white !important;
            }

            .swagger-ui .tab-headers,
            .swagger-ui .tab.tab-headers,
            .swagger-ui [role="tab"].tab-headers,
            .swagger-ui button[role="tab"].tab-headers {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
              color: white !important;
              border-color: #8b5cf6 !important;
            }

            .swagger-ui .tab-headers *,
            .swagger-ui .tab.tab-headers *,
            .swagger-ui [role="tab"].tab-headers *,
            .swagger-ui button[role="tab"].tab-headers * {
              color: white !important;
            }

            .swagger-ui .tab-schema,
            .swagger-ui .tab.tab-schema,
            .swagger-ui [role="tab"].tab-schema,
            .swagger-ui button[role="tab"].tab-schema {
              background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
              color: white !important;
              border-color: #06b6d4 !important;
            }

            .swagger-ui .tab-schema *,
            .swagger-ui .tab.tab-schema *,
            .swagger-ui [role="tab"].tab-schema *,
            .swagger-ui button[role="tab"].tab-schema * {
              color: white !important;
            }

            /* Дефолтный стиль для вкладок без класса */
            .swagger-ui .tab:not(.tab-success):not(.tab-error):not(.tab-request):not(.tab-params):not(.tab-headers):not(.tab-schema),
            .swagger-ui [role="tab"]:not(.tab-success):not(.tab-error):not(.tab-request):not(.tab-params):not(.tab-headers):not(.tab-schema),
            .swagger-ui button[role="tab"]:not(.tab-success):not(.tab-error):not(.tab-request):not(.tab-params):not(.tab-headers):not(.tab-schema) {
              background: linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted)) 70%, hsl(var(--primary))) !important;
              color: hsl(var(--foreground)) !important;
              border-color: hsl(var(--border)) !important;
            }

            /* Активные вкладки */
            .swagger-ui .tab.active,
            .swagger-ui [role="tab"][aria-selected="true"],
            .swagger-ui button[role="tab"][aria-selected="true"] {
              transform: translateY(-3px) !important;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
              z-index: 10 !important;
            }

            /* Hover эффекты */
            .swagger-ui .tab:hover,
            .swagger-ui [role="tab"]:hover,
            .swagger-ui button[role="tab"]:hover {
              transform: translateY(-4px) !important;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
              filter: brightness(1.1) !important;
            }

            /* Фоновая текстура */
            .swagger-ui::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background:
                radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.03) 0%, transparent 50%);
              pointer-events: none;
              z-index: 0;
            }

            .swagger-ui > div:first-child {
              position: relative;
              z-index: 1;
            }

            /* Убираем все outline эффекты */
            .swagger-ui * {
              outline: none !important;
            }

            .swagger-ui *:focus {
              outline: none !important;
            }

            .swagger-ui *:focus-visible {
              outline: none !important;
            }

            .swagger-ui .opblock-summary:focus {
              outline: none !important;
            }

            .swagger-ui a:focus {
              outline: none !important;
            }

            /* Темная тема только для основных элементов */
            .swagger-ui {
              color: hsl(var(--foreground)) !important;
              background-color: hsl(var(--background)) !important;
            }

            /* Исключаем цветные вкладки из общей темы */
            .swagger-ui .tab-success,
            .swagger-ui .tab-error,
            .swagger-ui .tab-request,
            .swagger-ui .tab-params,
            .swagger-ui .tab-headers,
            .swagger-ui .tab-schema {
              /* Цвет текста остается белым как в их стилях выше */
            }

            .swagger-ui .info .title {
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .scheme-container {
              background: hsl(var(--muted)) !important;
            }

            .swagger-ui .opblock-tag {
              color: hsl(var(--foreground)) !important;
              background: hsl(var(--muted)) !important;
              border: 1px solid hsl(var(--border)) !important;
            }

            .swagger-ui .opblock {
              background: hsl(var(--card)) !important;
              border: 1px solid hsl(var(--border)) !important;
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .opblock-summary-method {
              color: white !important;
              background: hsl(var(--primary)) !important;
            }

            .swagger-ui .opblock-summary-path,
            .swagger-ui .opblock-summary-path a {
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .parameter,
            .swagger-ui .parameter * {
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui table.model,
            .swagger-ui table.model * {
              background: hsl(var(--muted)) !important;
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .response,
            .swagger-ui .response * {
              background: hsl(var(--card)) !important;
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .response-col_status {
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .tab,
            .swagger-ui .tab * {
              background: hsl(var(--muted)) !important;
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .tab a,
            .swagger-ui .tab a:hover,
            .swagger-ui .tab a:focus {
              color: hsl(var(--foreground)) !important;
            }

            .swagger-ui .btn {
              background: hsl(var(--primary)) !important;
              color: hsl(var(--primary-foreground)) !important;
              border: 1px solid hsl(var(--primary)) !important;
            }

            .swagger-ui .btn:hover,
            .swagger-ui .btn:focus {
              background: hsl(var(--primary)) !important;
              opacity: 0.8 !important;
            }

            .swagger-ui textarea,
            .swagger-ui input,
            .swagger-ui select {
              background: hsl(var(--background)) !important;
              color: hsl(var(--foreground)) !important;
              border: 1px solid hsl(var(--border)) !important;
            }

            .swagger-ui textarea:focus,
            .swagger-ui input:focus,
            .swagger-ui select:focus {
              border-color: hsl(var(--primary)) !important;
              outline: none !important;
            }

            .swagger-ui .markdown p,
            .swagger-ui .markdown li,
            .swagger-ui .markdown code,
            .swagger-ui .markdown pre {
              color: hsl(var(--foreground)) !important;
              background: hsl(var(--muted)) !important;
            }

            .swagger-ui .response-col_links,
            .swagger-ui .response-col_links * {
              color: hsl(var(--foreground)) !important;
            }

            /* HTTP методы с разными цветами */
            .swagger-ui .opblock-summary-method {
              font-weight: bold !important;
              padding: 6px 12px !important;
              font-size: 12px !important;
              border-radius: 0 !important;
            }

            .swagger-ui .opblock-summary-method[data-method="get"] {
              background: #61affe !important;
              color: white !important;
              border-radius: 0 !important;
            }

            .swagger-ui .opblock-summary-method[data-method="post"] {
              background: #49cc90 !important;
              color: white !important;
              border-radius: 0 !important;
            }

            .swagger-ui .opblock-summary-method[data-method="put"] {
              background: #fca130 !important;
              color: white !important;
              border-radius: 0 !important;
            }

            .swagger-ui .opblock-summary-method[data-method="patch"] {
              background: #50e3c2 !important;
              color: white !important;
              border-radius: 0 !important;
            }

            .swagger-ui .opblock-summary-method[data-method="delete"] {
              background: #f93e3e !important;
              color: white !important;
              border-radius: 0 !important;
            }

            /* Выделение блоков операций */
            .swagger-ui .opblock {
              margin: 8px 0 !important;
              border-radius: 8px !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
              transition: all 0.2s ease !important;
            }

            .swagger-ui .opblock:hover {
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
              transform: translateY(-1px) !important;
            }

            /* Группы операций */
            .swagger-ui .opblock-tag {
              font-size: 18px !important;
              font-weight: 600 !important;
              padding: 12px 16px !important;
              margin: 16px 0 8px 0 !important;
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 70%, hsl(var(--muted))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border-left: 4px solid hsl(var(--accent)) !important;
            }

            /* Заголовки секций */
            /* Информационные секции */
            .swagger-ui .info {
              background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted) / 0.5)) !important;
              padding: 24px !important;
              margin-bottom: 24px !important;
              border: 1px solid hsl(var(--border)) !important;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06) !important;
              position: relative !important;
              overflow: hidden !important;
            }

            .swagger-ui .info::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary))) !important;
            }

            .swagger-ui .info .title {
              font-size: 28px !important;
              font-weight: 800 !important;
              color: white !important;
              margin-bottom: 12px !important;
              position: relative !important;
            }

            .swagger-ui .info .description,
            .swagger-ui .info .description *,
            .swagger-ui .info p,
            .swagger-ui .info span {
              font-size: 16px !important;
              line-height: 1.7 !important;
              color: white !important;
              margin-bottom: 0 !important;
              font-weight: 400 !important;
            }

            /* Версия API и OAS */
            .swagger-ui .info .version,
            .swagger-ui .info .version * {
              color: white !important;
            }

            /* Серверы */
            .swagger-ui .servers,
            .swagger-ui .servers *,
            .swagger-ui .server,
            .swagger-ui .server * {
              color: white !important;
            }

            /* URL сервера */
            .swagger-ui .server-url,
            .swagger-ui .server-url * {
              color: white !important;
            }

            /* Заголовки секций */
            .swagger-ui .servers > label,
            .swagger-ui .servers-title {
              color: white !important;
              font-weight: 600 !important;
            }

            /* Информация о версии */
            .swagger-ui .info .base-url,
            .swagger-ui .info .base-url * {
              color: white !important;
            }

            /* Описания операций (эндпоинтов) */
            .swagger-ui .opblock-summary-description,
            .swagger-ui .opblock .opblock-summary-description {
              color: hsl(var(--foreground) / 0.85) !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
              font-weight: 400 !important;
            }

            /* Описания параметров */
            .swagger-ui .parameter__description,
            .swagger-ui .parameters-col_description {
              color: hsl(var(--foreground) / 0.8) !important;
              font-size: 13px !important;
              line-height: 1.4 !important;
              font-weight: 400 !important;
            }

            /* Описания ответов */
            .swagger-ui .response .response-col_description,
            .swagger-ui .response .response-description {
              color: hsl(var(--foreground) / 0.85) !important;
              font-size: 13px !important;
              line-height: 1.4 !important;
              font-weight: 400 !important;
            }

            /* Markdown контент в описаниях */
            .swagger-ui .markdown p,
            .swagger-ui .markdown li,
            .swagger-ui .markdown span {
              color: hsl(var(--foreground) / 0.85) !important;
            }

            /* Заголовки в markdown */
            .swagger-ui .markdown h1,
            .swagger-ui .markdown h2,
            .swagger-ui .markdown h3,
            .swagger-ui .markdown h4,
            .swagger-ui .markdown h5,
            .swagger-ui .markdown h6 {
              color: hsl(var(--foreground) / 0.9) !important;
              font-weight: 600 !important;
            }

            /* Модели данных - супер премиум стиль */
            .swagger-ui table.model {
              border-radius: 16px !important;
              overflow: hidden !important;
              border: 3px solid transparent !important;
              border-image: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) 1 !important;
              box-shadow:
                0 12px 40px rgba(0, 0, 0, 0.1),
                0 0 20px rgba(99, 102, 241, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
              background:
                linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted))),
                radial-gradient(circle at top left, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
                radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.05) 0%, transparent 50%) !important;
              position: relative !important;
              backdrop-filter: blur(10px) !important;
            }

            .swagger-ui table.model::before {
              content: '📋';
              position: absolute;
              top: -12px;
              right: 16px;
              font-size: 20px;
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              -webkit-background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              background-clip: text;
              z-index: 2;
            }

            .swagger-ui table.model th {
              background:
                linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))),
                linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) !important;
              color: hsl(var(--primary-foreground)) !important;
              font-weight: 800 !important;
              padding: 18px 16px !important;
              text-transform: uppercase !important;
              letter-spacing: 1px !important;
              font-size: 11px !important;
              position: relative !important;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
            }

            .swagger-ui table.model th:first-child {
              border-top-left-radius: 12px !important;
            }

            .swagger-ui table.model th:last-child {
              border-top-right-radius: 12px !important;
            }

            .swagger-ui table.model th::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3px;
              background:
                linear-gradient(90deg, transparent, hsl(var(--primary-foreground)) 40%, hsl(var(--primary-foreground)) 60%, transparent),
                linear-gradient(90deg, transparent 20%, rgba(255, 255, 255, 0.3) 50%, transparent 80%) !important;
            }

            .swagger-ui table.model th::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) !important;
              pointer-events: none;
            }

            .swagger-ui table.model td {
              padding: 14px 16px !important;
              border-bottom: 1px solid hsl(var(--border) / 0.5) !important;
              border-right: 1px solid hsl(var(--border) / 0.3) !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
              vertical-align: middle !important;
            }

            .swagger-ui table.model td:last-child {
              border-right: none !important;
            }

            .swagger-ui table.model tr:nth-child(even) {
              background:
                linear-gradient(90deg, hsl(var(--muted) / 0.2), hsl(var(--muted) / 0.1)),
                linear-gradient(135deg, rgba(99, 102, 241, 0.02), rgba(168, 85, 247, 0.02)) !important;
            }

            .swagger-ui table.model tr:nth-child(odd) {
              background: hsl(var(--card)) !important;
            }

            .swagger-ui table.model tr:hover {
              background:
                linear-gradient(135deg, hsl(var(--accent) / 0.08), hsl(var(--primary) / 0.05)),
                linear-gradient(90deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.03)) !important;
              transform: translateX(3px) scale(1.01) !important;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
              z-index: 1 !important;
            }

            .swagger-ui table.model tr:hover td {
              color: white !important;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
            }

            /* Белый текст для всех ячеек моделей */
            .swagger-ui table.model td {
              color: white !important;
            }

            .swagger-ui table.model th {
              color: white !important;
            }

            /* Индикаторы типов данных */
            .swagger-ui table.model td:contains("string")::after,
            .swagger-ui table.model td:contains("integer")::after,
            .swagger-ui table.model td:contains("boolean")::after,
            .swagger-ui table.model td:contains("object")::after,
            .swagger-ui table.model td:contains("array")::after {
              content: '';
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              width: 8px;
              height: 8px;
              box-shadow: 0 0 8px currentColor;
            }

            .swagger-ui table.model td:contains("string")::after { background: #10b981; color: #10b981; }
            .swagger-ui table.model td:contains("integer")::after,
            .swagger-ui table.model td:contains("number")::after { background: #3b82f6; color: #3b82f6; }
            .swagger-ui table.model td:contains("boolean")::after { background: #f59e0b; color: #f59e0b; }
            .swagger-ui table.model td:contains("object")::after { background: #8b5cf6; color: #8b5cf6; }
            .swagger-ui table.model td:contains("array")::after { background: #06b6d4; color: #06b6d4; }

            /* Параметры */
            .swagger-ui .parameters {
              background: hsl(var(--card)) !important;
              border: 1px solid hsl(var(--border)) !important;
              border-radius: 8px !important;
              margin: 16px 0 !important;
            }

            .swagger-ui .parameter {
              border-bottom: 1px solid hsl(var(--border)) !important;
              padding: 12px !important;
            }

            .swagger-ui .parameter:last-child {
              border-bottom: none !important;
            }

            .swagger-ui .parameters-col_name {
              font-weight: 600 !important;
              color: hsl(var(--primary)) !important;
            }

            /* Ответы */
            .swagger-ui .responses {
              margin-top: 16px !important;
            }

            .swagger-ui .response {
              border: 2px solid hsl(var(--border)) !important;
              border-radius: 8px !important;
              margin: 8px 0 !important;
              background: hsl(var(--card)) !important;
            }

            .swagger-ui .response-col_status {
              font-weight: 600 !important;
              padding: 8px 12px !important;
              border-radius: 4px !important;
            }

            /* Статусы ответов */
            .swagger-ui .response-col_status[data-code="200"],
            .swagger-ui .response-col_status[data-code="201"] {
              background: #49cc90 !important;
              color: white !important;
            }

            .swagger-ui .response-col_status[data-code="400"],
            .swagger-ui .response-col_status[data-code="404"],
            .swagger-ui .response-col_status[data-code="500"] {
              background: #f93e3e !important;
              color: white !important;
            }

            /* Кнопки Try it out - сильно выделенные */
            .swagger-ui .btn.try-out__btn {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border: 2px solid hsl(var(--primary)) !important;
              border-radius: 8px !important;
              font-weight: 700 !important;
              font-size: 14px !important;
              padding: 8px 16px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
              overflow: hidden !important;
            }

            .swagger-ui .btn.try-out__btn::before {
              content: '' !important;
              position: absolute !important;
              top: 0 !important;
              left: -100% !important;
              width: 100% !important;
              height: 100% !important;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
              transition: left 0.5s !important;
            }

            .swagger-ui .btn.try-out__btn:hover {
              background: linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary))) !important;
              transform: translateY(-2px) !important;
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25) !important;
            }

            .swagger-ui .btn.try-out__btn:hover::before {
              left: 100% !important;
            }

            .swagger-ui .btn.try-out__btn:active {
              transform: translateY(0) !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
            }

            /* Все кнопки Swagger UI */
            .swagger-ui .btn {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 50%, hsl(var(--accent))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border: 2px solid hsl(var(--primary)) !important;
              border-radius: 6px !important;
              font-weight: 600 !important;
              padding: 6px 12px !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
              transition: all 0.3s ease !important;
              cursor: pointer !important;
            }

            .swagger-ui .btn:hover {
              background: linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary))) !important;
              transform: translateY(-1px) !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            }

            .swagger-ui .btn:active {
              transform: translateY(0) !important;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
            }

            /* Формы ввода */
            .swagger-ui .body-param textarea,
            .swagger-ui .body-param input {
              border-radius: 6px !important;
              border: 2px solid hsl(var(--border)) !important;
              transition: border-color 0.2s ease !important;
            }

            .swagger-ui .body-param textarea:focus,
            .swagger-ui .body-param input:focus {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1) !important;
            }

            /* Код и примеры */
            .swagger-ui .highlight-code,
            .swagger-ui .microlight {
              background: hsl(var(--muted)) !important;
              border: 1px solid hsl(var(--border)) !important;
              border-radius: 6px !important;
            }

            .swagger-ui .copy-to-clipboard {
              background: hsl(var(--primary)) !important;
              color: hsl(var(--primary-foreground)) !important;
            }

            /* Раскрывающиеся секции - сильно выделенные */
            .swagger-ui .opblock-summary {
              background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted))) !important;
              padding: 12px 16px !important;
              margin: 4px 0 !important;
              cursor: pointer !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
            }

            .swagger-ui .opblock-summary:hover {
              background: linear-gradient(135deg, hsl(var(--accent)), hsl(var(--card))) !important;
              transform: translateX(4px) !important;
            }

            .swagger-ui .opblock-summary:focus {
              outline: 3px solid hsl(var(--primary)) !important;
              outline-offset: 2px !important;
            }

            /* Стрелки раскрытия */
            .swagger-ui .opblock-summary .opblock-summary-control {
              background: hsl(var(--primary)) !important;
              width: 24px !important;
              height: 24px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              transition: all 0.3s ease !important;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
            }

            .swagger-ui .opblock-summary .opblock-summary-control:hover {
              background: hsl(var(--accent)) !important;
            }

            .swagger-ui .opblock-summary .opblock-summary-control svg {
              color: hsl(var(--primary-foreground)) !important;
              width: 14px !important;
              height: 14px !important;
            }

            /* Ссылки и кликабельные элементы */
            .swagger-ui a {
              color: hsl(var(--primary)) !important;
              text-decoration: none !important;
              border-bottom: 2px solid transparent !important;
              transition: all 0.2s ease !important;
              font-weight: 500 !important;
            }

            .swagger-ui a:hover {
              color: hsl(var(--accent)) !important;
              border-bottom-color: hsl(var(--accent)) !important;
              text-decoration: none !important;
            }

            .swagger-ui a:focus {
              outline: 2px solid hsl(var(--primary)) !important;
              outline-offset: 2px !important;
              border-radius: 2px !important;
            }

            /* Копирование кода */
            .swagger-ui .copy-to-clipboard {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border: none !important;
              padding: 10px 16px !important;
              font-size: 14px !important;
              font-weight: 600 !important;
              cursor: pointer !important;
              transition: all 0.3s ease !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              min-width: 80px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 6px !important;
              position: relative !important;
              overflow: hidden !important;
            }

            .swagger-ui .copy-to-clipboard:hover {
              background: linear-gradient(135deg, hsl(var(--accent)), hsl(var(--primary))) !important;
              transform: translateY(-2px) scale(1.05) !important;
              filter: brightness(1.1) !important;
            }

            .swagger-ui .copy-to-clipboard:active {
              transform: translateY(0) scale(0.98) !important;
            }

            /* Анимация успешного копирования */
            .swagger-ui .copy-to-clipboard.copied {
              background: linear-gradient(135deg, #10b981, #059669) !important;
              animation: copySuccess 0.8s ease-out !important;
            }

            @keyframes copySuccess {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }

            /* Выпадающие списки */
            .swagger-ui select {
              background: linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted))) !important;
              color: hsl(var(--foreground)) !important;
              border: 2px solid hsl(var(--border)) !important;
              padding: 8px 12px !important;
              font-size: 14px !important;
              cursor: pointer !important;
              transition: all 0.3s ease !important;
              appearance: none !important;
              background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='hsl(var(--foreground))' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
              background-repeat: no-repeat !important;
              background-position: right 8px center !important;
              background-size: 16px !important;
              padding-right: 32px !important;
            }

            .swagger-ui select:hover {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1) !important;
            }

            .swagger-ui select:focus {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2) !important;
              outline: none !important;
            }

            /* Радио кнопки и чекбоксы */
            .swagger-ui input[type="radio"],
            .swagger-ui input[type="checkbox"] {
              accent-color: hsl(var(--primary)) !important;
              width: 18px !important;
              height: 18px !important;
              cursor: pointer !important;
              border: 2px solid hsl(var(--border)) !important;
              border-radius: 4px !important;
              transition: all 0.2s ease !important;
            }

            .swagger-ui input[type="radio"]:checked,
            .swagger-ui input[type="checkbox"]:checked {
              background: hsl(var(--primary)) !important;
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2) !important;
            }

            .swagger-ui input[type="radio"]:hover,
            .swagger-ui input[type="checkbox"]:hover {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1) !important;
            }

            /* Вкладки - супер красочные и красивые */
            .swagger-ui .tab {
              background: linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted) / 0.8)) !important;
              border: 2px solid hsl(var(--border)) !important;
              margin-right: 4px !important;
              cursor: pointer !important;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
              overflow: hidden !important;
              backdrop-filter: blur(10px) !important;
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              padding: 8px 12px !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              min-height: 36px !important;
            }

            /* Более широкие селекторы для вкладок */
            .swagger-ui .tab,
            .swagger-ui .tabs > div,
            .swagger-ui .tab-header,
            .swagger-ui [role="tab"],
            .swagger-ui button[role="tab"] {
              background: linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted) / 0.8)) !important;
              border: 2px solid hsl(var(--border)) !important;
              margin-right: 4px !important;
              cursor: pointer !important;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
              position: relative !important;
              overflow: hidden !important;
              backdrop-filter: blur(10px) !important;
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              padding: 8px 12px !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              min-height: 36px !important;
            }

            /* Иконки для разных типов вкладок - более широкие селекторы */
            .swagger-ui .tab:contains("Response 200")::before,
            .swagger-ui .tab:contains("Response")::before,
            .swagger-ui .tab[data-name*="Response"]::before,
            .swagger-ui [role="tab"]:contains("Response")::before {
              content: '📊';
              font-size: 14px;
            }

            .swagger-ui .tab:contains("Request")::before,
            .swagger-ui .tab:contains("Body")::before,
            .swagger-ui .tab[data-name*="Request"]::before,
            .swagger-ui .tab[data-name*="Body"]::before,
            .swagger-ui [role="tab"]:contains("Request")::before,
            .swagger-ui [role="tab"]:contains("Body")::before {
              content: '📝';
              font-size: 14px;
            }

            .swagger-ui .tab:contains("Parameters")::before,
            .swagger-ui .tab[data-name*="Parameters"]::before,
            .swagger-ui [role="tab"]:contains("Parameters")::before {
              content: '⚙️';
              font-size: 14px;
            }

            .swagger-ui .tab:contains("Headers")::before,
            .swagger-ui .tab[data-name*="Headers"]::before,
            .swagger-ui [role="tab"]:contains("Headers")::before {
              content: '🏷️';
              font-size: 14px;
            }

            .swagger-ui .tab:contains("Schema")::before,
            .swagger-ui .tab[data-name*="Schema"]::before,
            .swagger-ui [role="tab"]:contains("Schema")::before {
              content: '📋';
              font-size: 14px;
            }

            /* Разные цвета для разных типов вкладок - широкие селекторы */
            .swagger-ui .tab:contains("Response 200"),
            .swagger-ui .tab:contains("Response 201"),
            .swagger-ui .tab[data-name*="Response"][data-name*="200"],
            .swagger-ui .tab[data-name*="Response"][data-name*="201"],
            .swagger-ui [role="tab"]:contains("Response 200"),
            .swagger-ui [role="tab"]:contains("Response 201") {
              background: linear-gradient(135deg, #10b981, #059669) !important; /* Зеленый успех */
              color: white !important;
              border-color: #10b981 !important;
            }

            .swagger-ui .tab:contains("Response 400"),
            .swagger-ui .tab:contains("Response 404"),
            .swagger-ui .tab:contains("Response 500"),
            .swagger-ui .tab[data-name*="Response"][data-name*="400"],
            .swagger-ui .tab[data-name*="Response"][data-name*="404"],
            .swagger-ui .tab[data-name*="Response"][data-name*="500"],
            .swagger-ui [role="tab"]:contains("Response 400"),
            .swagger-ui [role="tab"]:contains("Response 404"),
            .swagger-ui [role="tab"]:contains("Response 500") {
              background: linear-gradient(135deg, #ef4444, #dc2626) !important; /* Красный ошибка */
              color: white !important;
              border-color: #ef4444 !important;
            }

            .swagger-ui .tab:contains("Request"),
            .swagger-ui .tab:contains("Body"),
            .swagger-ui .tab[data-name*="Request"],
            .swagger-ui .tab[data-name*="Body"],
            .swagger-ui [role="tab"]:contains("Request"),
            .swagger-ui [role="tab"]:contains("Body") {
              background: linear-gradient(135deg, #3b82f6, #2563eb) !important; /* Синий запрос */
              color: white !important;
              border-color: #3b82f6 !important;
            }

            .swagger-ui .tab:contains("Parameters"),
            .swagger-ui .tab[data-name*="Parameters"],
            .swagger-ui [role="tab"]:contains("Parameters") {
              background: linear-gradient(135deg, #f59e0b, #d97706) !important; /* Оранжевый параметры */
              color: white !important;
              border-color: #f59e0b !important;
            }

            .swagger-ui .tab:contains("Headers"),
            .swagger-ui .tab[data-name*="Headers"],
            .swagger-ui [role="tab"]:contains("Headers") {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important; /* Фиолетовый headers */
              color: white !important;
              border-color: #8b5cf6 !important;
            }

            .swagger-ui .tab:contains("Schema"),
            .swagger-ui .tab[data-name*="Schema"],
            .swagger-ui [role="tab"]:contains("Schema") {
              background: linear-gradient(135deg, #06b6d4, #0891b2) !important; /* Циановый схема */
              color: white !important;
              border-color: #06b6d4 !important;
            }

            /* Дефолтный стиль для вкладок без специфического типа */
            .swagger-ui .tab:not(:contains("Response")):not(:contains("Request")):not(:contains("Parameters")):not(:contains("Headers")):not(:contains("Schema")):not(:contains("Body")),
            .swagger-ui [role="tab"]:not(:contains("Response")):not(:contains("Request")):not(:contains("Parameters")):not(:contains("Headers")):not(:contains("Schema")):not(:contains("Body")) {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border-color: hsl(var(--primary)) !important;
            }

            /* Анимации и эффекты */
            .swagger-ui .tab::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent) !important;
              transition: left 0.8s ease !important;
              z-index: 1;
            }

            .swagger-ui .tab > * {
              position: relative;
              z-index: 2;
            }

            .swagger-ui .tab:hover::before {
              left: 100% !important;
            }

            .swagger-ui .tab:hover {
              transform: translateY(-4px) scale(1.05) !important;
              box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25) !important;
              filter: brightness(1.1) !important;
            }

            .swagger-ui .tab.active {
              transform: translateY(-2px) !important;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
              filter: brightness(1.2) !important;
              animation: pulse-active 2s ease-in-out infinite !important;
            }

            .swagger-ui .tab.active::after {
              content: '';
              position: absolute;
              bottom: -3px;
              left: 50%;
              transform: translateX(-50%);
              width: 70%;
              height: 4px;
              background: rgba(255, 255, 255, 0.8) !important;
              border-radius: 2px 2px 0 0 !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            }

            /* Пульсирующая анимация для активной вкладки */
            @keyframes pulse-active {
              0%, 100% {
                filter: brightness(1.2);
              }
              50% {
                filter: brightness(1.3);
              }
            }

            /* Hover эффекты с частицами */
            .swagger-ui .tab:hover {
              animation: tab-hover 0.6s ease-out !important;
            }

            @keyframes tab-hover {
              0% {
                transform: translateY(0) scale(1);
              }
              50% {
                transform: translateY(-6px) scale(1.08);
              }
              100% {
                transform: translateY(-4px) scale(1.05);
              }
            }

            /* Градиентные тени для разных типов */
            .swagger-ui .tab[data-name*="Response"][data-name*="200"]:hover {
              box-shadow: 0 12px 30px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2) !important;
            }

            .swagger-ui .tab[data-name*="Response"][data-name*="400"]:hover {
              box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.2) !important;
            }

            .swagger-ui .tab[data-name*="Request"]:hover {
              box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2) !important;
            }

            .swagger-ui .tab[data-name*="Parameters"]:hover {
              box-shadow: 0 12px 30px rgba(245, 158, 11, 0.4), 0 0 20px rgba(245, 158, 11, 0.2) !important;
            }

            .swagger-ui .tab[data-name*="Headers"]:hover {
              box-shadow: 0 12px 30px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.2) !important;
            }

            .swagger-ui .tab[data-name*="Schema"]:hover {
              box-shadow: 0 12px 30px rgba(6, 182, 212, 0.4), 0 0 20px rgba(6, 182, 212, 0.2) !important;
            }

            /* Дополнительные эффекты для вкладок */
            .swagger-ui .tab {
              position: relative !important;
            }

            /* Неоновый эффект для активных вкладок */
            .swagger-ui .tab.active[data-name*="Response"][data-name*="200"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(16, 185, 129, 0.4),
                0 0 40px rgba(16, 185, 129, 0.2) !important;
            }

            .swagger-ui .tab.active[data-name*="Response"][data-name*="400"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(239, 68, 68, 0.4),
                0 0 40px rgba(239, 68, 68, 0.2) !important;
            }

            .swagger-ui .tab.active[data-name*="Request"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(59, 130, 246, 0.4),
                0 0 40px rgba(59, 130, 246, 0.2) !important;
            }

            .swagger-ui .tab.active[data-name*="Parameters"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(245, 158, 11, 0.4),
                0 0 40px rgba(245, 158, 11, 0.2) !important;
            }

            .swagger-ui .tab.active[data-name*="Headers"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(139, 92, 246, 0.4),
                0 0 40px rgba(139, 92, 246, 0.2) !important;
            }

            .swagger-ui .tab.active[data-name*="Schema"] {
              box-shadow:
                0 8px 25px rgba(0, 0, 0, 0.3),
                0 0 20px rgba(6, 182, 212, 0.4),
                0 0 40px rgba(6, 182, 212, 0.2) !important;
            }

            /* Анимированные частицы для эффекта */
            .swagger-ui .tab::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 0;
              height: 0;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
              border-radius: 50%;
              transform: translate(-50%, -50%);
              transition: all 0.6s ease !important;
              pointer-events: none;
            }

            .swagger-ui .tab:active::after {
              width: 120px;
              height: 120px;
              opacity: 0;
              animation: ripple 0.6s ease-out !important;
            }

            @keyframes ripple {
              0% {
                width: 0;
                height: 0;
                opacity: 0.8;
              }
              100% {
                width: 120px;
                height: 120px;
                opacity: 0;
              }
            }

            /* Бейджи с номерами для вкладок */
            .swagger-ui .tab::before {
              content: '';
              position: absolute;
              top: -8px;
              right: -8px;
              width: 20px;
              height: 20px;
              background: linear-gradient(135deg, #ff6b6b, #ee5a24);
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              z-index: 3;
            }

            .swagger-ui .tab:nth-child(1)::before { content: '1'; background: linear-gradient(135deg, #10b981, #059669); }
            .swagger-ui .tab:nth-child(2)::before { content: '2'; background: linear-gradient(135deg, #3b82f6, #2563eb); }
            .swagger-ui .tab:nth-child(3)::before { content: '3'; background: linear-gradient(135deg, #f59e0b, #d97706); }
            .swagger-ui .tab:nth-child(4)::before { content: '4'; background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
            .swagger-ui .tab:nth-child(5)::before { content: '5'; background: linear-gradient(135deg, #06b6d4, #0891b2); }

            /* Скрываем бейджи для неактивных вкладок */
            .swagger-ui .tab:not(.active)::before {
              opacity: 0.6;
              transform: scale(0.8);
            }

            .swagger-ui .tab.active::before {
              opacity: 1;
              transform: scale(1);
              animation: badge-pulse 2s ease-in-out infinite;
            }

            @keyframes badge-pulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              }
              50% {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              }
            }

            /* Скроллбары */
            .swagger-ui ::-webkit-scrollbar {
              width: 8px !important;
              height: 8px !important;
            }

            .swagger-ui ::-webkit-scrollbar-track {
              background: hsl(var(--muted)) !important;
              border-radius: 4px !important;
            }

            .swagger-ui ::-webkit-scrollbar-thumb {
              background: hsl(var(--border)) !important;
              border-radius: 4px !important;
              transition: background 0.3s ease !important;
            }

            .swagger-ui ::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--primary)) !important;
            }

            /* Скрываем раздражающие предупреждения */
            .swagger-ui .version-pragma {
              display: none !important;
            }

            /* Анимации загрузки - премиум */
            .swagger-ui .loading-container {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              padding: 60px !important;
              background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted))) !important;
              border-radius: 16px !important;
              margin: 20px 0 !important;
              border: 1px solid hsl(var(--border)) !important;
              position: relative !important;
              overflow: hidden !important;
            }

            .swagger-ui .loading-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent) !important;
              animation: shimmer 2s infinite !important;
            }

            .swagger-ui .loading-container::after {
              content: "" !important;
              width: 48px !important;
              height: 48px !important;
              border: 4px solid hsl(var(--border)) !important;
              border-top: 4px solid hsl(var(--primary)) !important;
              border-right: 4px solid hsl(var(--accent)) !important;
              border-radius: 50% !important;
              animation: spin 1.2s linear infinite !important;
              position: relative !important;
              z-index: 1 !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }

            .swagger-ui .loading-container > span {
              margin-top: 16px !important;
              color: hsl(var(--foreground)) !important;
              font-weight: 500 !important;
              font-size: 14px !important;
              position: relative !important;
              z-index: 1 !important;
            }

            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }

            /* Focus стили для доступности */
            .swagger-ui *:focus-visible {
              outline: 3px solid hsl(var(--primary)) !important;
              outline-offset: 2px !important;
              border-radius: 4px !important;
            }

            /* Пульсирующие эффекты для важных элементов */
            .swagger-ui .opblock-summary-method {
              animation: pulse-glow 2s ease-in-out infinite alternate !important;
            }

            @keyframes pulse-glow {
              from {
                box-shadow: 0 0 5px hsl(var(--primary) / 0.5), 0 0 10px hsl(var(--primary) / 0.3), 0 0 15px hsl(var(--primary) / 0.1);
              }
              to {
                box-shadow: 0 0 10px hsl(var(--primary) / 0.8), 0 0 20px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3);
              }
            }

            /* Анимация появления блоков */
            .swagger-ui .opblock {
              animation: fadeInUp 0.5s ease-out !important;
            }

            .swagger-ui .opblock:nth-child(1) { animation-delay: 0.1s !important; }
            .swagger-ui .opblock:nth-child(2) { animation-delay: 0.2s !important; }
            .swagger-ui .opblock:nth-child(3) { animation-delay: 0.3s !important; }
            .swagger-ui .opblock:nth-child(4) { animation-delay: 0.4s !important; }
            .swagger-ui .opblock:nth-child(5) { animation-delay: 0.5s !important; }

            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            /* Hover эффекты для интерактивных зон */
            .swagger-ui .parameter:hover {
              background: hsl(var(--accent) / 0.3) !important;
              border-left: 4px solid hsl(var(--primary)) !important;
              transition: all 0.2s ease !important;
            }

            .swagger-ui .response:hover {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
              transition: all 0.2s ease !important;
            }

            /* Иконки с эффектами */
            .swagger-ui svg {
              transition: all 0.2s ease !important;
            }

            .swagger-ui button:hover svg,
            .swagger-ui a:hover svg {
              transform: scale(1.1) !important;
            }

            /* Специальные эффекты для моделей данных */
            .swagger-ui .model-title {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              -webkit-background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              background-clip: text !important;
              font-weight: 700 !important;
              font-size: 16px !important;
            }

            /* Улучшенные формы */
            .swagger-ui .body-param__textarea,
            .swagger-ui .body-param__input {
              background: linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted))) !important;
              border: 2px solid hsl(var(--border)) !important;
              border-radius: 8px !important;
              padding: 12px !important;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
              font-size: 14px !important;
              line-height: 1.4 !important;
              transition: all 0.3s ease !important;
              box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05) !important;
            }

            .swagger-ui .body-param__textarea:focus,
            .swagger-ui .body-param__input:focus {
              border-color: hsl(var(--primary)) !important;
              box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.05) !important;
              transform: translateY(-1px) !important;
            }

            /* Мобильная адаптация */
            @media (max-width: 768px) {
              /* Скрываем описания методов на мобильных */
              .swagger-ui .opblock-summary-description,
              .swagger-ui .opblock .opblock-summary-description {
                display: none !important;
              }

              /* Увеличиваем отступы между методами на мобильных */
              .swagger-ui .opblock {
                margin: 16px 0 !important;
              }

              /* Уменьшаем заголовки на мобильных */
              .swagger-ui .opblock-tag {
                font-size: 16px !important;
                padding: 10px 12px !important;
                margin: 16px 0 8px 0 !important;
              }

              /* Увеличиваем кнопки HTTP методов для мобильных */
              .swagger-ui .opblock-summary-method {
                padding: 6px 10px !important;
                font-size: 11px !important;
                min-width: 60px !important;
                text-align: center !important;
              }

              /* Адаптируем заголовок API */
              .swagger-ui .info .title {
                font-size: 24px !important;
                margin-bottom: 8px !important;
              }

              /* Уменьшаем описание API */
              .swagger-ui .info .description {
                font-size: 14px !important;
                line-height: 1.4 !important;
              }

              /* Адаптируем hero секцию */
              .swagger-ui + div > div > div > div > div > h1 {
                font-size: 28px !important;
                margin-bottom: 8px !important;
              }

              /* Уменьшаем бейджи в hero секции */
              .swagger-ui + div > div > div > div > div > div:last-child {
                gap: 4px !important;
                flex-wrap: wrap !important;
              }

              .swagger-ui + div > div > div > div > div > div:last-child span {
                font-size: 10px !important;
                padding: 2px 6px !important;
              }

              /* Увеличиваем кнопки копирования на мобильных */
              .swagger-ui .copy-to-clipboard {
                padding: 12px 18px !important;
                font-size: 13px !important;
                min-width: 90px !important;
                gap: 4px !important;
              }

              /* Увеличиваем отступы в схемах на мобильных */
              .swagger-ui table.model {
                font-size: 12px !important;
              }

              .swagger-ui table.model td,
              .swagger-ui table.model th {
                padding: 8px 6px !important;
              }
            }

            /* Очень маленькие экраны */
            @media (max-width: 480px) {
              .swagger-ui .opblock-summary-method {
                padding: 4px 8px !important;
                font-size: 10px !important;
                min-width: 50px !important;
              }

              .swagger-ui .opblock-tag {
                font-size: 14px !important;
                padding: 8px 10px !important;
              }

              .swagger-ui .info .title {
                font-size: 20px !important;
              }

              .swagger-ui .info .description {
                font-size: 13px !important;
              }

              /* Увеличиваем кнопки копирования на очень маленьких экранах */
              .swagger-ui .copy-to-clipboard {
                padding: 10px 14px !important;
                font-size: 12px !important;
                min-width: 75px !important;
              }

              .swagger-ui table.model {
                font-size: 11px !important;
              }

              .swagger-ui table.model td,
              .swagger-ui table.model th {
                padding: 6px 4px !important;
              }
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
              }
              40% {
                transform: translateY(-4px);
              }
              60% {
                transform: translateY(-2px);
              }
            }

            /* Эффект bounce для кнопок при клике */
            .swagger-ui .btn:active {
              animation: bounce 0.3s ease !important;
            }

            /* Дополнительные декоративные элементы */
            .swagger-ui .model-toggle {
              background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) !important;
              color: hsl(var(--primary-foreground)) !important;
              border-radius: 20px !important;
              padding: 4px 12px !important;
              font-size: 11px !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              transition: all 0.3s ease !important;
              cursor: pointer !important;
            }

            .swagger-ui .model-toggle:hover {
              transform: scale(1.05) !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            }

            /* Красивые разделители */
            .swagger-ui .info hgroup::after,
            .swagger-ui .opblock-tag::after {
              content: '';
              display: block;
              height: 2px;
              background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary))) !important;
              margin-top: 8px !important;
              border-radius: 1px !important;
            }

            /* Улучшенные маркеры списков */
            .swagger-ui .markdown ul li::before {
              content: '▸';
              color: white !important;
              font-weight: bold !important;
              margin-right: 8px !important;
            }

            .swagger-ui .markdown ol {
              counter-reset: item;
            }

            .swagger-ui .markdown ol li::before {
              content: counter(item) '.';
              counter-increment: item;
              color: hsl(var(--primary)) !important;
              font-weight: 600 !important;
              margin-right: 8px !important;
            }

            /* Свойства модели с красивыми индикаторами */
            .swagger-ui .model .property {
              position: relative !important;
              padding-left: 20px !important;
              color: white !important;
            }

            .swagger-ui .model .property::before {
              content: '▸';
              position: absolute;
              left: 0;
              color: white !important;
              font-weight: bold !important;
              font-size: 14px !important;
            }

            /* Вложенные модели */
            .swagger-ui .model .inner {
              margin-left: 20px !important;
              border-left: 2px solid hsl(var(--primary) / 0.3) !important;
              padding-left: 16px !important;
              position: relative !important;
              color: white !important;
            }

            .swagger-ui .model .inner * {
              color: white !important;
            }

            .swagger-ui .model .inner::before {
              content: '';
              position: absolute;
              top: 0;
              left: -2px;
              width: 2px;
              height: 20px;
              background: linear-gradient(to bottom, hsl(var(--primary)), transparent) !important;
            }

            /* Типы данных с цветными бейджами */
            .swagger-ui .prop-type {
              display: inline-block !important;
              padding: 2px 8px !important;
              border-radius: 12px !important;
              font-size: 11px !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              margin-left: 8px !important;
              position: relative !important;
              color: white !important;
            }

            .swagger-ui .prop-type:contains("string") {
              background: linear-gradient(135deg, #10b981, #059669) !important;
              color: white !important;
            }

            .swagger-ui .prop-type:contains("integer"),
            .swagger-ui .prop-type:contains("number") {
              background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
              color: white !important;
            }

            .swagger-ui .prop-type:contains("boolean") {
              background: linear-gradient(135deg, #f59e0b, #d97706) !important;
              color: white !important;
            }

            .swagger-ui .prop-type:contains("object") {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
              color: white !important;
            }

            .swagger-ui .prop-type:contains("array") {
              background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
              color: white !important;
            }

            /* Переключатели моделей - прозрачный фон, белые стрелки */
            .swagger-ui .model-toggle {
              background: transparent !important;
              color: white !important;
              border: none !important;
              border-radius: 20px !important;
              padding: 4px 12px !important;
              font-size: 11px !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              transition: all 0.3s ease !important;
              cursor: pointer !important;
              box-shadow: none !important;
            }

            .swagger-ui .model-toggle:hover {
              background: rgba(255, 255, 255, 0.1) !important;
              transform: scale(1.05) !important;
            }

            /* SVG стрелка в тогглере - белая */
            .swagger-ui .model-toggle::after {
              background: url("data:image/svg+xml;charset=utf-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3e%3cpath fill='white' d='M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'/%3e%3c/svg%3e") 50% no-repeat !important;
              background-size: 100% !important;
              content: "" !important;
              display: block !important;
              height: 20px !important;
              width: 20px !important;
            }

            /* Стильные blockquote */
            .swagger-ui .markdown blockquote {
              border-left: 4px solid hsl(var(--primary)) !important;
              background:
                linear-gradient(135deg, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.1)),
                linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05)) !important;
              padding: 16px 20px !important;
              margin: 20px 0 !important;
              border-radius: 0 12px 12px 0 !important;
              position: relative !important;
              box-shadow: inset 4px 0 0 hsl(var(--primary) / 0.5) !important;
            }

            .swagger-ui .markdown blockquote::before {
              content: '"';
              font-size: 48px !important;
              color: hsl(var(--primary) / 0.2) !important;
              position: absolute !important;
              top: -8px !important;
              left: 12px !important;
              font-family: serif !important;
              font-weight: bold !important;
            }

            .swagger-ui .markdown blockquote::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)) !important;
              border-radius: inherit !important;
              pointer-events: none !important;
            }
          `}</style>
          <SwaggerUIModule
            spec={spec}
            docExpansion="list"
            deepLinking={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={(req) => {
              console.log('🚀 API Request:', req.url, req.method);
              return req;
            }}
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
          />
        </div>
      </div>
    </div>
  );
}
