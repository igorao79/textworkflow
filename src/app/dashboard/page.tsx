'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow, WorkflowExecution } from '@/types/workflow';
import { Activity, Play, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workflowsRes, executionsRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/executions')
      ]);

      if (workflowsRes.ok) {
        const workflowsData = await workflowsRes.json();
        setWorkflows(workflowsData);
      }

      if (executionsRes.ok) {
        const executionsData = await executionsRes.json();
        setExecutions(executionsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Загрузка дашборда...</div>
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
                    {workflows.map((workflow) => (
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
                    {executions.slice(0, 50).map((execution) => (
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
