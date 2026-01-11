'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow, WorkflowExecution } from '@/types/workflow';
import { Activity, Play, Clock, CheckCircle, XCircle, AlertTriangle, Pause, Play as PlayIcon } from 'lucide-react';
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
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWorkflowsPage, setCurrentWorkflowsPage] = useState(1);
  const [currentExecutionsPage, setCurrentExecutionsPage] = useState(1);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Добавляем timeout на случай зависания запросов
    const timeout = setTimeout(() => {
      console.warn('Dashboard loading timeout, forcing loading=false');
      setLoading(false);
    }, 10000); // 10 секунд timeout

    try {
      // Простая загрузка без AbortController - даем запросам время выполниться
      const [workflowsRes, executionsRes, queueStatsRes] = await Promise.allSettled([
        fetch('/api/workflows'),
        fetch('/api/executions'),
        fetch('/api/queue/stats')
      ]);

      // Обрабатываем результаты с Promise.allSettled
      if (workflowsRes.status === 'fulfilled' && workflowsRes.value.ok) {
        const workflowsData = await workflowsRes.value.json();
        setWorkflows(Array.isArray(workflowsData) ? workflowsData : []);
        setCurrentWorkflowsPage(1);
      } else {
        console.warn('Failed to load workflows:', workflowsRes.status === 'rejected' ? workflowsRes.reason : 'Response not ok');
        setWorkflows([]);
      }

      if (executionsRes.status === 'fulfilled' && executionsRes.value.ok) {
        const executionsData = await executionsRes.value.json();
        setExecutions(Array.isArray(executionsData) ? executionsData : []);
        setCurrentExecutionsPage(1);
      } else {
        console.warn('Failed to load executions:', executionsRes.status === 'rejected' ? executionsRes.reason : 'Response not ok');
        setExecutions([]);
      }

      if (queueStatsRes.status === 'fulfilled' && queueStatsRes.value.ok) {
        const queueStatsData = await queueStatsRes.value.json();
        setQueueStats(queueStatsData);
      } else {
        console.warn('Failed to load queue stats:', queueStatsRes.status === 'rejected' ? queueStatsRes.reason : 'Response not ok');
        // Fallback значения для queue stats
        setQueueStats({
          waiting: 0,
          active: 0,
          completedCount: 0,
          failedCount: 0,
          paused: false,
          completed: 0,
          failed: 0,
          retries: 0,
          totalJobs: 0
        });
      }
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
  };

  const toggleQueuePause = async () => {
    if (queueActionLoading) return;

    setQueueActionLoading(true);
    try {
      const action = queueStats?.paused ? 'resume' : 'pause';
      const response = await fetch('/api/queue/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Перезагрузить данные
        await loadData();
      }
    } catch (error) {
      console.error('Error toggling queue pause:', error);
    } finally {
      setQueueActionLoading(false);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Управление workflow и мониторинг выполнений
          </p>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ожидают</p>
                      <p className="text-2xl font-bold">{queueStats.waiting}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Выполняются</p>
                      <p className="text-2xl font-bold">{queueStats.active}</p>
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

                  <div className="flex gap-2">
                    <Button
                      onClick={toggleQueuePause}
                      disabled={queueActionLoading}
                      variant={queueStats.paused ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                    >
                      {queueActionLoading ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Выполнение...
                        </>
                      ) : queueStats.paused ? (
                        <>
                          <PlayIcon className="w-4 h-4 mr-2" />
                          Возобновить
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Приостановить
                        </>
                      )}
                    </Button>
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
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ожидают', value: queueStats.waiting, fill: '#fbbf24' },
                        { name: 'Выполняются', value: queueStats.active, fill: '#3b82f6' },
                        { name: 'Завершено', value: queueStats.completedCount, fill: '#10b981' },
                        { name: 'Ошибок', value: queueStats.failedCount, fill: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
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
                          <h3 className="font-medium">{workflow.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                              {workflow.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {getTriggerTypeLabel(workflow.trigger.type)}
                            </span>
                          </div>
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
                            <span className="font-medium">Workflow {execution.workflowId.slice(-8)}</span>
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
      </div>
    </div>
  );
}
