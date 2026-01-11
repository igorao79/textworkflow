'use client';

import dynamic from 'next/dynamic';

// Динамический импорт Swagger UI для избежания проблем с SSR
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            API Documentation
          </h1>
          <p className="text-muted-foreground">
            Полная документация REST API для FlowForge
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-sm">
          <SwaggerUI spec={spec} />
        </div>
      </div>
    </div>
  );
}
