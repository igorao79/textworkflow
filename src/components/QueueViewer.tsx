'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Trash2, Plus, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface QueueTask {
  id: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  priority?: number;
}

interface QueueStats {
  size: number;
  pending: number;
  concurrency: number;
  isPaused: boolean;
  timeout: number;
}

interface TaskStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

interface QueueState {
  tasks: QueueTask[];
  queueStats: QueueStats;
  taskStats: TaskStats;
}

export default function QueueViewer() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Получение состояния очереди
  const fetchQueueState = async () => {
    try {
      setError(null);
      const response = await fetch('/api/queue');
      const result = await response.json();

      if (result.success) {
        setQueueState(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Не удалось загрузить состояние очереди');
      console.error('Ошибка при загрузке состояния очереди:', err);
    }
  };

  // Добавление новой задачи
  const addTask = async () => {
    if (!newTask.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: newTask }),
      });

      const result = await response.json();

      if (result.success) {
        setNewTask('');
        await fetchQueueState(); // Обновляем состояние после добавления
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Не удалось добавить задачу');
      console.error('Ошибка при добавлении задачи:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Управление очередью
  const controlQueue = async (action: 'pause' | 'resume' | 'clear' | 'clear-completed') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchQueueState(); // Обновляем состояние после действия
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(`Не удалось выполнить действие: ${action}`);
      console.error(`Ошибка при выполнении действия ${action}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Получение цвета для статуса задачи
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Получение иконки для статуса задачи
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Форматирование времени выполнения
  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '';
    const end = endTime || Date.now();
    const duration = Math.round((end - startTime) / 1000);
    return `${duration}с`;
  };

  // Автоматическое обновление каждые 2 секунды
  useEffect(() => {
    fetchQueueState();
    const interval = setInterval(fetchQueueState, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!queueState) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Загрузка состояния очереди...
          </div>
        </CardContent>
      </Card>
    );
  }

  const { tasks, queueStats, taskStats } = queueState;

  return (
    <div className="space-y-6">
      {/* Статистика очереди */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Статистика очереди
          </CardTitle>
          <CardDescription>
            Текущая нагрузка и статус задач
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{queueStats.pending}</div>
              <div className="text-sm text-gray-600">Выполняются</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{queueStats.size}</div>
              <div className="text-sm text-gray-600">В очереди</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
              <div className="text-sm text-gray-600">Завершено</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{taskStats.failed}</div>
              <div className="text-sm text-gray-600">Ошибок</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Конкурентность: {queueStats.concurrency}</span>
              <span>Таймаут: {queueStats.timeout / 1000}с</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Статус:</span>
              <Badge variant={queueStats.isPaused ? "destructive" : "default"}>
                {queueStats.isPaused ? 'Приостановлена' : 'Активна'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление очередью */}
      <Card>
        <CardHeader>
          <CardTitle>Управление очередью</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              onClick={() => controlQueue(queueStats.isPaused ? 'resume' : 'pause')}
              variant={queueStats.isPaused ? "default" : "secondary"}
              size="sm"
              disabled={isLoading}
            >
              {queueStats.isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
              {queueStats.isPaused ? 'Возобновить' : 'Приостановить'}
            </Button>
            <Button
              onClick={() => controlQueue('clear-completed')}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить завершенные
            </Button>
            <Button
              onClick={() => controlQueue('clear')}
              variant="destructive"
              size="sm"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить все
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch('/api/queue/process', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });
                  const result = await response.json();
                  if (response.ok) {
                    console.log('✅ Queue processed:', result);
                  } else {
                    setError(result.error || 'Не удалось обработать очередь');
                  }
                  await fetchQueueState(); // Обновляем состояние после обработки
                } catch (err) {
                  setError('Не удалось обработать очередь');
                  console.error('Ошибка при обработке очереди:', err);
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="default"
              size="sm"
              disabled={isLoading}
            >
              <Play className="w-4 h-4 mr-1" />
              Обработать очередь
            </Button>
            <Button
              onClick={fetchQueueState}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Обновить
            </Button>
          </div>

          {/* Добавление новой задачи */}
          <div className="flex gap-2">
            <Input
              placeholder="Описание новой задачи..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <Button onClick={addTask} disabled={!newTask.trim() || isLoading}>
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  await fetch('/api/test-queue', { method: 'POST' });
                  await fetchQueueState(); // Обновляем состояние после добавления
                } catch (err) {
                  setError('Не удалось добавить тестовые задачи');
                  console.error('Ошибка при добавлении тестовых задач:', err);
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="outline"
              disabled={isLoading}
              title="Добавить несколько тестовых задач для демонстрации"
            >
              Демо задачи
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список задач */}
      <Card>
        <CardHeader>
          <CardTitle>Задачи в очереди ({tasks.length})</CardTitle>
          <CardDescription>
            Список всех задач с их текущим статусом
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Очередь пуста. Добавьте задачу для начала работы.
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="font-medium">{task.task}</div>
                        <div className="text-sm text-gray-500">
                          ID: {task.id}
                          {task.startTime && (
                            <span className="ml-2">
                              ({formatDuration(task.startTime, task.endTime)})
                            </span>
                          )}
                          {task.priority && task.priority > 0 && (
                            <span className="ml-2 text-orange-600">
                              Приоритет: {task.priority}
                            </span>
                          )}
                        </div>
                        {task.error && (
                          <div className="text-sm text-red-600 mt-1">
                            Ошибка: {task.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status === 'pending' && 'Ожидает'}
                      {task.status === 'running' && 'Выполняется'}
                      {task.status === 'completed' && 'Завершена'}
                      {task.status === 'failed' && 'Ошибка'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
