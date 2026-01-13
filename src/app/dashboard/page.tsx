'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Workflow, WorkflowExecution, CronTriggerConfig } from '@/types/workflow';
import { Activity, Play, Clock, CheckCircle, XCircle, AlertTriangle, Pause, FileText, Trash2, Loader2 } from 'lucide-react';
import { getQueueState } from '@/lib/queue-visualization';
import { Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [queueStats, setQueueStats] = useState<{
    waiting: number;
    active: number;
    completedCount: number;
    failedCount: number;
    paused: boolean;
    completed: number;
    failed: number;
    retries: number;
    totalJobs: number;
    cronTasks?: number;
  } | null>(null);
  const [pQueueTasks, setPQueueTasks] = useState<any[]>([]);
  const [pQueueStats, setPQueueStats] = useState<any>(null);
  const [cronTasks, setCronTasks] = useState<Array<{
    workflowId: string;
    isRunning: boolean;
    nextExecution: Date | null;
  }>>([]);
  const [cronTasksLoading, setCronTasksLoading] = useState(false);

  // Получаем все workflow с cron триггером
  const cronWorkflows = workflows.filter(w => w.trigger.type === 'cron');
  const [loading, setLoading] = useState(true);
  const [currentWorkflowsPage, setCurrentWorkflowsPage] = useState(1);
  const [currentExecutionsPage, setCurrentExecutionsPage] = useState(1);
  const [users, setUsers] = useState<Array<{
    id: number;
    name: string;
    email: string;
    created_at: string;
  }>>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const itemsPerPage = 5;

  const loadCronTasks = async () => {
    try {
      setCronTasksLoading(true);
      const response = await fetch('/api/cron');
      if (response.ok) {
        const cronTasksData = await response.json();
        setCronTasks((prev: Array<{
          workflowId: string;
          isRunning: boolean;
          nextExecution: Date | null;
        }>) => {
          // Проверяем, изменились ли данные
          if (JSON.stringify(prev) !== JSON.stringify(cronTasksData)) {
            return cronTasksData;
          }
          return prev;
        });
      } else {
        // Если API недоступен, сбрасываем статусы
        setCronTasks((prev: Array<{
          workflowId: string;
          isRunning: boolean;
          nextExecution: Date | null;
        }>) => prev.length > 0 ? [] : prev);
      }
    } catch (error) {
      console.error('Error loading cron tasks:', error);
      setCronTasks((prev: Array<{
        workflowId: string;
        isRunning: boolean;
        nextExecution: Date | null;
      }>) => prev.length > 0 ? [] : prev);
    } finally {
      setCronTasksLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    // Добавляем timeout на случай зависания запросов
    const timeout = setTimeout(() => {
      console.warn('Dashboard loading timeout, forcing loading=false');
      setLoading(false);
    }, 30000); // 30 секунд timeout для продакшена

    try {
      // Простая загрузка без AbortController - даем запросам время выполниться
      const [workflowsRes, executionsRes, queueStatsRes] = await Promise.allSettled([
        fetch('/api/workflows'),
        fetch('/api/executions'),
        fetch('/api/queue/stats')
      ]);

      // Обрабатываем результаты с Promise.allSettled
      if (workflowsRes.status === 'fulfilled' && workflowsRes.value.ok) {
        try {
          const workflowsData = await workflowsRes.value.json();
          setWorkflows(Array.isArray(workflowsData) ? workflowsData : []);
          setCurrentWorkflowsPage(1);
          console.log('✅ Workflows loaded successfully:', workflowsData.length);
        } catch (parseError) {
          console.error('❌ Failed to parse workflows response:', parseError);
          setWorkflows([]);
        }
      } else {
        const errorMsg = workflowsRes.status === 'rejected' ? workflowsRes.reason : `HTTP ${workflowsRes.value?.status}`;
        console.warn('⚠️ Failed to load workflows:', errorMsg);
        setWorkflows([]);
      }

      if (executionsRes.status === 'fulfilled' && executionsRes.value.ok) {
        try {
          const executionsData = await executionsRes.value.json();
          setExecutions(Array.isArray(executionsData) ? executionsData : []);
          setCurrentExecutionsPage(1);
          console.log('✅ Executions loaded successfully:', executionsData.length);
        } catch (parseError) {
          console.error('❌ Failed to parse executions response:', parseError);
          setExecutions([]);
        }
      } else {
        const errorMsg = executionsRes.status === 'rejected' ? executionsRes.reason : `HTTP ${executionsRes.value?.status}`;
        console.warn('⚠️ Failed to load executions:', errorMsg);
        setExecutions([]);
      }

      if (queueStatsRes.status === 'fulfilled' && queueStatsRes.value.ok) {
        try {
          const queueStatsData = await queueStatsRes.value.json();
          setQueueStats(queueStatsData);
          console.log('✅ Queue stats loaded successfully:', queueStatsData);
        } catch (parseError) {
          console.error('❌ Failed to parse queue stats response:', parseError);
        }
      } else {
        const errorMsg = queueStatsRes.status === 'rejected' ? queueStatsRes.reason : `HTTP ${queueStatsRes.value?.status}`;
        console.warn('⚠️ Failed to load queue stats:', errorMsg);
        // Fallback значения для queue stats
        setQueueStats({
          waiting: 0,
          active: cronTasks.length, // Добавляем cron задачи как активные
          completedCount: 0,
          failedCount: 0,
          paused: false,
          completed: 0,
          failed: 0,
          retries: 0,
          totalJobs: cronTasks.length,
          cronTasks: cronTasks.length
        });
      }

      // Загружаем состояние PQueue для визуализации
      try {
        const pQueueState = getQueueState();
        setPQueueTasks(pQueueState.tasks.slice(0, 5)); // Показываем только последние 5 задач
        setPQueueStats(pQueueState.queueStats);
      } catch (error) {
        console.warn('Failed to load PQueue state:', error);
        setPQueueTasks([]);
        setPQueueStats(null);
      }

      // Загружаем cron задачи отдельно
      await loadCronTasks();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Устанавливаем пустые данные в случае ошибки
      setWorkflows([]);
      setExecutions([]);
      setQueueStats(null);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [cronTasks]);

  useEffect(() => {
    loadData();

    // Автообновление cron задач каждые 30 секунд
    const cronInterval = setInterval(() => {
      loadCronTasks();
    }, 30000);

    // Автообновление состояния PQueue и основной статистики каждые 10 секунд
    const queueInterval = setInterval(async () => {
      try {
        // Обновляем PQueue состояние
        const pQueueState = getQueueState();
        setPQueueTasks(prev => {
          const newTasks = pQueueState.tasks.slice(0, 5);
          // Проверяем, изменились ли данные
          if (JSON.stringify(prev) !== JSON.stringify(newTasks)) {
            return newTasks;
          }
          return prev;
        });
        setPQueueStats((prev: any) => {
          // Проверяем, изменились ли данные
          if (JSON.stringify(prev) !== JSON.stringify(pQueueState.queueStats)) {
            return pQueueState.queueStats;
          }
          return prev;
        });

        // Обновляем основную статистику очереди
        const queueStatsRes = await fetch('/api/queue/stats');
        if (queueStatsRes.ok) {
          const queueStatsData = await queueStatsRes.json();
          setQueueStats(prev => {
            // Проверяем, изменились ли данные
            if (JSON.stringify(prev) !== JSON.stringify(queueStatsData)) {
              console.log('📊 Dashboard: Updated queue stats:', queueStatsData);
              return queueStatsData;
            }
            return prev;
          });
        }
      } catch (error) {
        console.warn('Failed to update queue state:', error);
      }
    }, 10000); // Увеличили с 2 до 10 секунд

    return () => {
      clearInterval(cronInterval);
      clearInterval(queueInterval);
    };
  }, [loadData]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
        setShowUsersModal(true);
      } else {
        alert('Ошибка при загрузке пользователей');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Ошибка при загрузке пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'webhook': return 'Webhook';
      case 'cron': return 'Расписание';
      case 'email': return 'Email';
      default: return type;
    }
  };

  const extractResultText = (result: Record<string, unknown>) => {
    // Если есть httpResponse с text полем, показываем только его
    if (result.httpResponse && typeof result.httpResponse === 'object') {
      const httpResponse = result.httpResponse as Record<string, unknown>;
      if (httpResponse.text && typeof httpResponse.text === 'string') {
        return httpResponse.text;
      }
    }
    // Иначе показываем весь результат как есть
    return JSON.stringify(result, null, 2);
  };

  // Пагинация для workflows
  const workflowsTotalPages = Math.ceil(workflows.length / itemsPerPage);
  const workflowsStartIndex = (currentWorkflowsPage - 1) * itemsPerPage;
  const workflowsEndIndex = workflowsStartIndex + itemsPerPage;
  const currentWorkflows = workflows.slice(workflowsStartIndex, workflowsEndIndex);

  const goToWorkflowsPage = (page: number) => {
    setCurrentWorkflowsPage(Math.max(1, Math.min(page, workflowsTotalPages)));
  };

  // Пагинация для executions
  const executionsTotalPages = Math.ceil(executions.length / itemsPerPage);
  const executionsStartIndex = (currentExecutionsPage - 1) * itemsPerPage;
  const executionsEndIndex = executionsStartIndex + itemsPerPage;
  const currentExecutions = executions.slice(executionsStartIndex, executionsEndIndex);

  const goToExecutionsPage = (page: number) => {
    setCurrentExecutionsPage(Math.max(1, Math.min(page, executionsTotalPages)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            {/* Анимированный спиннер */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-primary/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>

            {/* Текст загрузки */}
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold text-foreground">Загрузка дашборда</div>
              <div className="text-sm text-muted-foreground">Подготовка данных и статистики...</div>
            </div>

            {/* Анимированные точки */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.isActive).length,
    totalExecutions: executions.length,
    completedExecutions: executions.filter(e => e.status === 'completed').length,
    failedExecutions: executions.filter(e => e.status === 'failed').length,
    runningExecutions: executions.filter(e => e.status === 'running').length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Управление workflow и мониторинг выполнений
              </p>
            </div>
            <Button
              onClick={loadUsers}
              disabled={usersLoading}
              variant="outline"
              className="gap-2"
            >
              {usersLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Загрузка...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Получить пользователей</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Всего Workflow</p>
                  <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Активных</p>
                  <p className="text-2xl font-bold">{stats.activeWorkflows}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Выполнений</p>
                  <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Завершено</p>
                  <p className="text-2xl font-bold">{stats.completedExecutions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Ошибок</p>
                  <p className="text-2xl font-bold">{stats.failedExecutions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">В работе</p>
                  <p className="text-2xl font-bold">{stats.runningExecutions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Статистика очереди */}
        {queueStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Cron Workflow ({cronWorkflows.length})
                    {cronTasksLoading && (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  {cronTasks.some(task => task.isRunning) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const runningCount = cronTasks.filter(task => task.isRunning).length;
                        if (confirm(`Остановить все ${runningCount} активных cron задач?`)) {
                          try {
                            setCronTasksLoading(true);
                            const response = await fetch('/api/cron', {
                              method: 'DELETE'
                            });
                            if (response.ok) {
                              // Обновляем статус всех задач на неактивные
                              setCronTasks(prev => prev.map(task => ({ ...task, isRunning: false })));
                            }
                          } catch (error) {
                            console.error('Error stopping all cron tasks:', error);
                          } finally {
                            setCronTasksLoading(false);
                          }
                        }
                      }}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Остановить все
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cronWorkflows.length === 0 ? (
                  <p className="text-muted-foreground">Нет workflow с cron триггером</p>
                ) : (
                  <div className="space-y-3">
                    {cronWorkflows.map((workflow) => {
                      const task = cronTasks.find(t => t.workflowId === workflow.id);
                      const isRunning = task?.isRunning || false;

                      return (
                        <div key={workflow.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{workflow.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {isRunning ? 'Запущена' : 'Остановлена'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Расписание: {workflow.trigger.type === 'cron' ? (workflow.trigger.config as CronTriggerConfig).schedule || 'Не задано' : 'Не задано'} • {workflow.actions.length} действий
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isRunning ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  console.log('🔥 Dashboard: Starting cron activation for workflow:', workflow.id);

                                  try {
                                    console.log('📡 Dashboard: Sending request to /api/cron/activate/' + workflow.id);

                                    // Отправляем запрос на сервер для активации cron задачи
                                    const response = await fetch(`/api/cron/activate/${workflow.id}`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      }
                                    });

                                    console.log('📡 Dashboard: Response received:', {
                                      status: response.status,
                                      ok: response.ok,
                                      statusText: response.statusText
                                    });

                                    // Проверяем тело ответа
                                    const responseData = await response.json();
                                    console.log('📡 Dashboard: Response data:', responseData);

                                    if (response.ok) {
                                      console.log('✅ Dashboard: Cron activation successful, updating UI state');
                                      // Обновляем локальное состояние - показываем задачу как запущенную
                                      setCronTasks(prev => {
                                        const existing = prev.find(t => t.workflowId === workflow.id);
                                        if (existing) {
                                          return prev.map(t => t.workflowId === workflow.id ? { ...t, isRunning: true } : t);
                                        } else {
                                          return [...prev, { workflowId: workflow.id, isRunning: true, nextExecution: null }];
                                        }
                                      });
                                      console.log('✅ Dashboard: UI state updated successfully');
                                    } else {
                                      console.error('❌ Dashboard: Cron activation failed:', {
                                        status: response.status,
                                        statusText: response.statusText,
                                        errorData: responseData
                                      });
                                      alert('Ошибка при активации cron задачи: ' + (responseData.error || 'Неизвестная ошибка'));
                                    }
                                  } catch (error) {
                                    console.error('💥 Dashboard: Exception during cron activation:', error);
                                    alert('Ошибка при активации cron задачи');
                                  }
                                }}
                              >
                                <Play className="w-4 h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Запустить</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setCronTasksLoading(true);
                                    const response = await fetch(`/api/cron/deactivate/${workflow.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok) {
                                      // Обновляем статус задачи на неактивную
                                      setCronTasks(prev => prev.map(t =>
                                        t.workflowId === workflow.id ? { ...t, isRunning: false } : t
                                      ));
                                    }
                                  } catch (error) {
                                    console.error('Error stopping cron task:', error);
                                  } finally {
                                    setCronTasksLoading(false);
                                  }
                                }}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Остановить
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Если это cron workflow, сначала останавливаем cron задачу
                                  if (workflow.trigger.type === 'cron') {
                                    console.log('🛑 Stopping cron task before deleting workflow:', workflow.id);
                                    try {
                                      await fetch(`/api/cron/deactivate/${workflow.id}`, {
                                        method: 'DELETE'
                                      });
                                      // Обновляем локальное состояние cron задач
                                      setCronTasks(prev => prev.map(t =>
                                        t.workflowId === workflow.id ? { ...t, isRunning: false } : t
                                      ));
                                    } catch (cronError) {
                                      console.warn('⚠️ Failed to stop cron task, but continuing with workflow deletion:', cronError);
                                    }
                                  }

                                  // Удаляем сам workflow
                                  const response = await fetch(`/api/workflows/${workflow.id}`, {
                                    method: 'DELETE'
                                  });
                                  if (response.ok) {
                                    // Обновляем локальное состояние - удаляем workflow из списка
                                    setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
                                    // Также удаляем из списка cron задач
                                    setCronTasks(prev => prev.filter(t => t.workflowId !== workflow.id));
                                  } else {
                                    alert('Ошибка при удалении workflow');
                                  }
                                } catch (error) {
                                  console.error('Error deleting workflow:', error);
                                  alert('Ошибка при удалении workflow');
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Статистика очереди
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Статус:</span>
                    <Badge variant={queueStats.paused ? "destructive" : "default"}>
                      {queueStats.paused ? "Приостановлена" : "Активна"}
                    </Badge>
                  </div>

                  {/* Список задач PQueue */}
                  {pQueueTasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Активные задачи:</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {pQueueTasks.slice(0, 3).map((task: any, index: number) => (
                          <div key={task.id || index} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                            {task.status === 'running' ? (
                              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            ) : task.status === 'pending' ? (
                              <Clock className="w-3 h-3 text-yellow-500" />
                            ) : task.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className="truncate flex-1">{task.task}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                task.status === 'pending' ? 'border-yellow-200 text-yellow-800' :
                                task.status === 'running' ? 'border-blue-200 text-blue-800' :
                                task.status === 'completed' ? 'border-green-200 text-green-800' :
                                'border-red-200 text-red-800'
                              }`}
                            >
                              {task.status === 'pending' && 'Ожидает'}
                              {task.status === 'running' && 'Выполняется'}
                              {task.status === 'completed' && 'Готово'}
                              {task.status === 'failed' && 'Ошибка'}
                            </Badge>
                          </div>
                        ))}
                        {pQueueTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            и ещё {pQueueTasks.length - 3} задач...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ожидают</p>
                      <p className="text-2xl font-bold">{queueStats.waiting}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Выполняются</p>
                      <p className="text-2xl font-bold">{cronTasks.filter(t => t.isRunning).length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Завершено</p>
                      <p className="text-2xl font-bold">{queueStats.completedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ошибок</p>
                      <p className="text-2xl font-bold">{queueStats.failedCount}</p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Распределение задач</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart key={`${queueStats.waiting}-${cronTasks.filter(t => t.isRunning).length}-${queueStats.completedCount}-${queueStats.failedCount}`}>
                    <Pie
                      data={[
                        { name: 'Ожидают', value: queueStats.waiting, fill: '#fbbf24' },
                        { name: 'Выполняются', value: cronTasks.filter(t => t.isRunning).length, fill: '#3b82f6' },
                        { name: 'Завершено', value: queueStats.completedCount, fill: '#10b981' },
                        { name: 'Ошибок', value: queueStats.failedCount, fill: '#ef4444' },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Таблицы */}
        <Tabs defaultValue="workflows" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflows">Workflow</TabsTrigger>
            <TabsTrigger value="executions">Выполнения</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <Card>
              <CardHeader>
                <CardTitle>Список Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                {workflows.length === 0 ? (
                  <p className="text-muted-foreground">Нет созданных workflow</p>
                ) : (
                  <div className="space-y-4">
                    {currentWorkflows.map((workflow) => (
                      <div key={workflow.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium">{workflow.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {getTriggerTypeLabel(workflow.trigger.type)}
                              </Badge>
                              {workflow.trigger.type === 'cron' && (
                                <Badge variant="secondary" className="text-xs max-w-full sm:max-w-none truncate">
                                  <span className="hidden sm:inline">Расписание: </span>
                                  {(workflow.trigger.config as CronTriggerConfig).schedule || 'Без расписания'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="shrink-0">
                            <span className="hidden sm:inline">{workflow.isActive ? 'Выполнен' : 'Не выполнен'}</span>
                            <span className="sm:hidden">{workflow.isActive ? '✓' : '✗'}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {workflow.description || 'Без описания'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Действий: {workflow.actions.length}</span>
                          <span>Создан: {formatDate(workflow.createdAt.toString())}</span>
                          <span>Обновлен: {formatDate(workflow.updatedAt.toString())}</span>
                        </div>
                      </div>
                    ))}

                    {/* Пагинация для workflows */}
                    {workflowsTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                          Показано {workflowsStartIndex + 1}-{Math.min(workflowsEndIndex, workflows.length)} из {workflows.length} workflow
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToWorkflowsPage(currentWorkflowsPage - 1)}
                            disabled={currentWorkflowsPage === 1}
                            className="px-3"
                          >
                            <span className="hidden sm:inline">Предыдущая</span>
                            <span className="sm:hidden">←</span>
                          </Button>

                          {/* Номера страниц - адаптивно */}
                          <div className="flex items-center gap-1">
                            {/* Показываем 3 кнопки на мобильных, 5 на десктопе */}
                            <div className="hidden sm:flex gap-1">
                              {Array.from({ length: Math.min(5, workflowsTotalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(workflowsTotalPages - 4, currentWorkflowsPage - 2)) + i;
                                if (pageNum > workflowsTotalPages) return null;
                                return (
                                  <Button
                                    key={`desktop-${pageNum}`}
                                    variant={pageNum === currentWorkflowsPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToWorkflowsPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            {/* Показываем 3 кнопки на мобильных */}
                            <div className="flex sm:hidden gap-1">
                              {Array.from({ length: Math.min(3, workflowsTotalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(workflowsTotalPages - 2, currentWorkflowsPage - 1)) + i;
                                if (pageNum > workflowsTotalPages) return null;
                                return (
                                  <Button
                                    key={`mobile-${pageNum}`}
                                    variant={pageNum === currentWorkflowsPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToWorkflowsPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToWorkflowsPage(currentWorkflowsPage + 1)}
                            disabled={currentWorkflowsPage === workflowsTotalPages}
                            className="px-3"
                          >
                            <span className="hidden sm:inline">Следующая</span>
                            <span className="sm:hidden">→</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executions">
            <Card>
              <CardHeader>
                <CardTitle>История выполнений</CardTitle>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <p className="text-muted-foreground">Нет выполнений workflow</p>
                ) : (
                  <div className="space-y-4">
                    {currentExecutions.map((execution) => (
                      <div key={execution.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <span className="font-medium">
                              {(() => {
                                const workflow = workflows.find(w => w.id === execution.workflowId);
                                return workflow ? workflow.name : `Workflow ${execution.workflowId.slice(-8)}`;
                              })()}
                            </span>
                          </div>
                          {getStatusBadge(execution.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>ID: {execution.id.slice(-8)}</span>
                          <span>Начало: {formatDate(execution.startedAt.toString())}</span>
                          {execution.completedAt && (
                            <span>Завершение: {formatDate(execution.completedAt.toString())}</span>
                          )}
                        </div>
                        {execution.error && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Ошибка: {execution.error}
                          </p>
                        )}
                        {execution.result && execution.status === 'completed' && (
                          <div className="mt-2">
                            <details className="text-sm">
                              <summary className="cursor-pointer text-green-600 font-medium flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                Результат выполнения
                              </summary>
                              <div className="mt-2 p-3 bg-green-50 rounded border">
                                <div className="text-sm text-green-800 whitespace-pre-wrap">
                                  {extractResultText(execution.result)}
                                </div>
                              </div>
                            </details>
                          </div>
                        )}
                        <div className="mt-2">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground">
                              Логи ({execution.logs.length})
                            </summary>
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                              {execution.logs.map((log) => (
                                <div key={log.id} className="text-xs">
                                  <span className="font-mono">
                                    {formatDate(log.timestamp.toString())}
                                  </span>
                                  <span className={`ml-2 px-1 rounded ${
                                    log.level === 'error' ? 'bg-red-100 text-red-800' :
                                    log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.level}
                                  </span>
                                  <span className="ml-2">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}

                    {/* Пагинация */}
                    {executionsTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                          Показано {executionsStartIndex + 1}-{Math.min(executionsEndIndex, executions.length)} из {executions.length} выполнений
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToExecutionsPage(currentExecutionsPage - 1)}
                            disabled={currentExecutionsPage === 1}
                            className="px-3"
                          >
                            <span className="hidden sm:inline">Предыдущая</span>
                            <span className="sm:hidden">←</span>
                          </Button>

                          {/* Номера страниц - адаптивно */}
                          <div className="flex items-center gap-1">
                            {/* Показываем 3 кнопки на мобильных, 5 на десктопе */}
                            <div className="hidden sm:flex gap-1">
                              {Array.from({ length: Math.min(5, executionsTotalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(executionsTotalPages - 4, currentExecutionsPage - 2)) + i;
                                if (pageNum > executionsTotalPages) return null;
                                return (
                                  <Button
                                    key={`desktop-${pageNum}`}
                                    variant={pageNum === currentExecutionsPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToExecutionsPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            {/* Показываем 3 кнопки на мобильных */}
                            <div className="flex sm:hidden gap-1">
                              {Array.from({ length: Math.min(3, executionsTotalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(executionsTotalPages - 2, currentExecutionsPage - 1)) + i;
                                if (pageNum > executionsTotalPages) return null;
                                return (
                                  <Button
                                    key={`mobile-${pageNum}`}
                                    variant={pageNum === currentExecutionsPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToExecutionsPage(pageNum)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToExecutionsPage(currentExecutionsPage + 1)}
                            disabled={currentExecutionsPage === executionsTotalPages}
                            className="px-3"
                          >
                            <span className="hidden sm:inline">Следующая</span>
                            <span className="sm:hidden">→</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Модалка с пользователями */}
        <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] w-[95vw] sm:w-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Пользователи базы данных</DialogTitle>
              <DialogDescription className="text-sm">
                Список всех пользователей из таблицы test_users
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-96 overflow-y-auto overflow-x-hidden">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет пользователей в базе данных</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-4">
                    Всего пользователей: {users.length}
                  </div>
                  {/* Контейнер с горизонтальной прокруткой для мобильных */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-3 text-left text-sm font-medium whitespace-nowrap min-w-[60px]">ID</th>
                            <th className="px-3 py-3 text-left text-sm font-medium whitespace-nowrap min-w-[120px]">Имя</th>
                            <th className="px-3 py-3 text-left text-sm font-medium whitespace-nowrap min-w-[200px]">Email</th>
                            <th className="px-3 py-3 text-left text-sm font-medium whitespace-nowrap min-w-[120px]">Создан</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-muted/50">
                              <td className="px-3 py-3 text-sm font-mono min-w-[60px]">{user.id}</td>
                              <td className="px-3 py-3 text-sm font-medium min-w-[120px]">{user.name}</td>
                              <td className="px-3 py-3 text-sm break-all min-w-[200px]">{user.email}</td>
                              <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap min-w-[120px]">
                                {formatDate(user.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUsersModal(false)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
