'use client';

import React, { useRef, useState, useEffect } from 'react';
import { getActionTitle } from './WorkflowNode';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Workflow, WorkflowAction, WorkflowTrigger, EmailActionConfig, TelegramActionConfig, HttpActionConfig, DatabaseActionConfig, TransformActionConfig } from '@/types/workflow';
import { CheckCircle, RotateCcw, Play } from 'lucide-react';
import { WorkflowNode } from './WorkflowNode';
import { ActionPalette } from './ActionPalette';
import { TriggerSelector } from './TriggerSelector';
import { notifySuccess, notifyError, notifyInfo } from '@/services/notificationService';

interface WorkflowEditorProps {
  workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;
  onWorkflowChange: (data: WorkflowEditorProps['workflowData']) => void;
  onSubmit?: () => Promise<void> | void;
  isSubmitting?: boolean;
  setIsSubmitting?: (submitting: boolean) => void;
}

// Компонент для отображения выполнения workflow
function ExecutionMonitorModal({
  isOpen,
  onClose,
  onExecute,
  actions,
  isSubmitting,
  setIsSubmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  onExecute?: () => void;
  actions: WorkflowAction[];
  isSubmitting?: boolean;
  setIsSubmitting?: (submitting: boolean) => void;
}) {
  const [executionSteps, setExecutionSteps] = useState<Array<{
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
  }>>([]);

  // Флаг для предотвращения повторного запуска
  const [hasStartedExecution, setHasStartedExecution] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [successNotificationSent, setSuccessNotificationSent] = useState(false);

  // Функция для выполнения workflow с отслеживанием шагов
  const executeWorkflow = React.useCallback(async (submitFn?: () => Promise<void> | void) => {
    if (isSubmitting || hasStartedExecution) return;

    const executeFn = submitFn || (() => Promise.resolve());

    setIsExecuting(true);
    setIsSubmitting?.(true);
    setHasStartedExecution(true);
    setExecutionProgress(1); // Начинаем с 1%, чтобы показать что выполнение началось
    setSuccessNotificationSent(false); // Сбрасываем флаг уведомления

    // Инициализируем шаги
    const steps = actions.map(action => ({
      id: action.id,
      title: getActionTitle(action.type),
      status: 'pending' as const
    }));
    setExecutionSteps(steps);

    try {
      // Имитируем выполнение шагов
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Обновляем статус на "running"
        setExecutionSteps(prev => prev.map(s =>
          s.id === step.id
            ? { ...s, status: 'running', startTime: new Date() }
            : s
        ));


        // Имитируем задержку выполнения
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Обновляем статус на "completed"
        setExecutionSteps(prev => prev.map(s =>
          s.id === step.id
            ? { ...s, status: 'completed', endTime: new Date() }
            : s
        ));

        // Обновляем прогресс
        const progress = Math.round(((i + 1) / steps.length) * 100);
        setExecutionProgress(progress);

      }

      setExecutionProgress(100);

      // Выполняем реальный workflow
      if (executeFn) {
        await executeFn();
      }

      // Устанавливаем статус завершения ТОЛЬКО после успешного выполнения
      setIsSubmitting?.(false);
      setIsExecuting(false);

      // Уведомление об успехе будет отправлено в WorkflowForm.tsx при получении ответа от API

    } catch (error) {
      console.error('❌ Workflow execution failed:', error);

      // Устанавливаем статус завершения даже при ошибке
      setIsSubmitting?.(false);
      setIsExecuting(false);
      setExecutionProgress(100);

      // Отправляем уведомление об ошибке
      notifyError(
        'Ошибка выполнения Workflow',
        `Произошла ошибка при выполнении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );

      // Обновляем статус failed для текущего шага
      setExecutionSteps(prev => prev.map(s =>
        s.status === 'running'
          ? { ...s, status: 'failed', endTime: new Date() }
          : s
      ));

    } finally {
      // Гарантируем, что статус завершения установлен в любом случае
      console.log('🔄 Finally block: ensuring completion state...');
      if (executionProgress < 100) {
        setExecutionProgress(100);
      }
      // Не устанавливаем isSubmitting здесь, чтобы не конфликтовать с успешным выполнением
      setSuccessNotificationSent(false); // Сбрасываем флаг для следующего запуска
    }
  }, [setIsSubmitting, isSubmitting, hasStartedExecution, actions]);

  // Гарантируем корректное отображение завершения (без уведомлений)
  React.useEffect(() => {
    if (executionProgress === 100 && hasStartedExecution) {
      // Если прогресс 100%, гарантируем правильное состояние
      if (isSubmitting) {
        console.log('🔧 Fixing completion state: progress 100%, but still submitting');
        setIsSubmitting?.(false);
        setIsExecuting(false);
      }
    }
  }, [executionProgress, isSubmitting, hasStartedExecution, setIsSubmitting]);

  // Автоматически закрываем модальное окно после завершения выполнения
  React.useEffect(() => {
    if (isOpen && !isExecuting && executionSteps.length > 0 && hasStartedExecution) {
      // Не закрываем автоматически, даем пользователю посмотреть результаты
    }
  }, [isOpen, isExecuting, executionSteps, hasStartedExecution]);

  // Автоматически запускаем выполнение при открытии модального окна
  React.useEffect(() => {
    if (isOpen && !hasStartedExecution && onExecute) {
      executeWorkflow(onExecute);
    }
  }, [isOpen, hasStartedExecution, onExecute, executeWorkflow]);

  // Сбрасываем флаги при закрытии модального окна
  React.useEffect(() => {
    if (!isOpen) {
      setHasStartedExecution(false);
      setIsExecuting(false);
      setExecutionSteps([]);
      setExecutionProgress(0);
      setSuccessNotificationSent(false);
    }
  }, [isOpen]);



  return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle>Мониторинг выполнения Workflow</DialogTitle>
          <DialogDescription>
            Отслеживание прогресса выполнения каждого шага workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс выполнения</span>
              <span>{executionProgress}%</span>
            </div>
            <Progress value={executionProgress} className="w-full" />
          </div>

          <div className="text-center py-8 text-muted-foreground">
            {!hasStartedExecution ? (
              <div className="rounded-full h-12 w-12 bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            ) : isSubmitting ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            ) : (
              <div className="rounded-full h-12 w-12 bg-green-500 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            )}
            <p className="text-lg font-medium">
              {!hasStartedExecution
                ? 'Готов к запуску'
                : isSubmitting
                  ? 'Выполнение workflow'
                  : 'Workflow выполнен!'
              }
            </p>
            <p className="text-sm mt-2">
              {!hasStartedExecution
                ? 'Нажмите кнопку для запуска workflow'
                : isSubmitting
                  ? 'Пожалуйста, подождите завершения всех операций'
                  : 'Все действия успешно выполнены'
              }
            </p>
          </div>

          {executionSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Очередь выполнения:</h3>
              {executionSteps.map((step) => {
                const statusColors = {
                  pending: 'bg-gray-300',
                  running: 'bg-blue-500 animate-pulse',
                  completed: 'bg-green-500',
                  failed: 'bg-red-500'
                };

                const statusTexts = {
                  pending: 'Ожидает',
                  running: 'Выполняется...',
                  completed: 'Завершено',
                  failed: 'Ошибка'
                };

                return (
                  <div key={step.id} className="flex items-center space-x-3 p-4 border rounded-lg bg-card">
                    <div className={`w-4 h-4 rounded-full ${statusColors[step.status]}`}></div>
                    <div className="flex-1">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-sm text-muted-foreground">{statusTexts[step.status]}</div>
                      {step.startTime && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Начало: {step.startTime.toLocaleTimeString('ru-RU')}
                          {step.endTime && ` → Завершение: ${step.endTime.toLocaleTimeString('ru-RU')}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            {!isExecuting && hasStartedExecution && (
              <Button
                variant="default"
                onClick={() => {
                  setHasStartedExecution(false);
                  setIsExecuting(false);
                  setExecutionSteps([]);
                  setExecutionProgress(0);
                  setIsSubmitting?.(false);
                  setSuccessNotificationSent(false);
                  // Перезапустим выполнение
                  setTimeout(() => {
                    executeWorkflow();
                  }, 500);
                }}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Запустить заново
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExecuting}
            >
              {isSubmitting ? 'Выполняется...' : 'Закрыть'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Компонент для drop зоны
function DropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop-zone',
    data: {
      type: 'drop-zone'
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors relative ${
        isOver
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/20'
      }`}
      suppressHydrationWarning={true}
    >
      {children}
    </div>
  );
}


// Функция валидации действия (копия из WorkflowNode)
const validateAction = (action: WorkflowAction): boolean => {
  switch (action.type) {
    case 'email':
      const emailConfig = action.config as EmailActionConfig;
      return !!(emailConfig.subject && emailConfig.body);
    case 'telegram':
      const telegramConfig = action.config as TelegramActionConfig;
      return !!(telegramConfig.message && telegramConfig.message.trim() !== '');
    case 'http':
      const httpConfig = action.config as HttpActionConfig;
      return !!(httpConfig.url && httpConfig.method);
    case 'database':
      const dbConfig = action.config as DatabaseActionConfig;
      if (!dbConfig.operation || !dbConfig.table) return false;
      if ((dbConfig.operation === 'insert' || dbConfig.operation === 'update') && !dbConfig.data) return false;
      if ((dbConfig.operation === 'update' || dbConfig.operation === 'delete') && !dbConfig.where) return false;
      return true;
    case 'transform':
      const transformConfig = action.config as TransformActionConfig;
      return !!(transformConfig.input && transformConfig.transformation && transformConfig.output);
    default:
      return false;
  }
};

export function WorkflowEditor({ workflowData, onWorkflowChange, onSubmit, isSubmitting, setIsSubmitting }: WorkflowEditorProps) {
  const actionCounterRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showExecutionMonitor, setShowExecutionMonitor] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Проверяем валидность всего workflow
  const isWorkflowValid = React.useMemo(() => {
    // Должен быть хотя бы один триггер
    if (!workflowData.trigger || !workflowData.trigger.type) return false;

    // Должно быть хотя бы одно действие
    if (!workflowData.actions || workflowData.actions.length === 0) return false;

    // Все действия должны быть валидными
    return workflowData.actions.every(action => validateAction(action));
  }, [workflowData.trigger, workflowData.actions]);

  // Логируем изменения showExecutionMonitor
  React.useEffect(() => {
    // Monitor state changes for debugging if needed
  }, [showExecutionMonitor]);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Подсчет количества действий каждого типа
  const actionCounts = workflowData.actions.reduce((counts: Record<string, number>, action: WorkflowAction) => {
    counts[action.type] = (counts[action.type] || 0) + 1;
    return counts;
  }, {});


  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = () => {
    // Drag start handled by useSortable in WorkflowNode
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeType = active.data.current?.type;
    const overId = over.id as string;
    const activeId = active.id as string;

    // Если перетаскиваем новый action в рабочую область
    if (activeType === 'palette-item' && overId === 'drop-zone') {
      // Проверяем лимит в 20 задач
      if (workflowData.actions.length >= 20) {
        return; // Не добавляем, если уже 20 или больше задач
      }

      const activeData = active.data.current;
      if (!activeData) return;

      actionCounterRef.current += 1;
      const newAction: WorkflowAction = {
        id: `action_${actionCounterRef.current}`,
        type: activeData.actionType,
        config: getDefaultConfig(activeData.actionType) as WorkflowAction['config'],
        position: { x: 100, y: 100 }
      };

      onWorkflowChange({
        ...workflowData,
        actions: [...workflowData.actions, newAction]
      });
    }

    // Обработка сортировки существующих элементов
    if (activeType === 'workflow-node') {
      const overType = over.data.current?.type;

      if (overType === 'workflow-node' && activeId !== overId) {
        const oldIndex = workflowData.actions.findIndex(action => action.id === activeId);
        const newIndex = workflowData.actions.findIndex(action => action.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          onWorkflowChange({
            ...workflowData,
            actions: arrayMove(workflowData.actions, oldIndex, newIndex)
          });
        }
      }
    }
  };

  const getDefaultConfig = (actionType: string) => {
    switch (actionType) {
      case 'email':
        return { from: 'onboarding@resend.dev', to: 'samptv59@gmail.com', subject: '', body: '' };
      case 'http':
        return { url: '', method: 'GET', headers: {} };
      case 'telegram':
        return { chatId: '', message: '' };
      case 'database':
        return { operation: 'select', table: '', data: {} };
      case 'transform':
        return { input: '', transformation: '', output: '' };
      default:
        return {};
    }
  };

  const addAction = (actionType: string) => {
    actionCounterRef.current += 1;
    const newAction: WorkflowAction = {
      id: `action_${actionCounterRef.current}`,
      type: actionType as WorkflowAction['type'],
      config: getDefaultConfig(actionType) as WorkflowAction['config'],
      position: { x: 100, y: 100 }
    };

    onWorkflowChange({
      ...workflowData,
      actions: [...workflowData.actions, newAction]
    });
  };

  const handleActionUpdate = (actionId: string, updates: Partial<WorkflowAction>) => {
    const updatedActions = workflowData.actions.map(action =>
      action.id === actionId ? { ...action, ...updates } : action
    );
    onWorkflowChange({ ...workflowData, actions: updatedActions });
  };

  const handleActionDelete = (actionId: string) => {
    const updatedActions = workflowData.actions.filter(action => action.id !== actionId);
    onWorkflowChange({ ...workflowData, actions: updatedActions });
  };


  const handleTriggerChange = (trigger: WorkflowTrigger) => {
    onWorkflowChange({ ...workflowData, trigger });
  };


  const handleDragOver = () => {
    // Сортировка теперь обрабатывается только в handleDragEnd
    // handleDragOver используется только для добавления новых элементов
    return;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6" suppressHydrationWarning={true}>
        {/* Палитра действий */}
        <div className="min-w-0" suppressHydrationWarning={true}>
          <ActionPalette
            actionCounts={actionCounts}
            onAddAction={addAction}
            isMobile={isMobile}
            maxActionsReached={workflowData.actions.length >= 20}
          />
        </div>

        {/* Рабочая область */}
        <div className="min-w-0" suppressHydrationWarning={true}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Workflow Canvas</span>
                <Badge variant="outline">
                  {workflowData.actions.length} actions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Селектор триггера */}
              <div className="mb-6">
                <TriggerSelector
                  trigger={workflowData.trigger}
                  onTriggerChange={handleTriggerChange}
                />
              </div>

              {/* Зона перетаскивания */}
              <DropZone>
                {/* Анимированная шестеренка всегда на фоне */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <svg
                    className={`w-24 h-24 animate-gear-spin ${
                      workflowData.actions.length > 0 ? 'text-red-500' : 'text-black'
                    }`}
                    data-name="Layer 1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                      <path d="M8 11a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0-5a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"/>
                      <path d="M8.5 16h-1A1.5 1.5 0 0 1 6 14.5v-.85a5.91 5.91 0 0 1-.58-.24l-.6.6A1.54 1.54 0 0 1 2.7 14l-.7-.7a1.5 1.5 0 0 1 0-2.12l.6-.6a5.91 5.91 0 0 1-.25-.58H1.5A1.5 1.5 0 0 1 0 8.5v-1A1.5 1.5 0 0 1 1.5 6h.85a5.91 5.91 0 0 1 .24-.58L2 4.82A1.5 1.5 0 0 1 2 2.7l.7-.7a1.54 1.54 0 0 1 2.12 0l.6.6A5.91 5.91 0 0 1 6 2.35V1.5A1.5 1.5 0 0 1 7.5 0h1A1.5 1.5 0 0 1 10 1.5v.85a5.91 5.91 0 0 1 .58.24l.6-.6A1.54 1.54 0 0 1 13.3 2l.7.7a1.5 1.5 0 0 1 0 2.12l-.6.6a5.91 5.91 0 0 1 .24.58h.85A1.5 1.5 0 0 1 16 7.5v1a1.5 1.5 0 0 1-1.5 1.5h-.85a5.91 5.91 0 0 1-.24.58l.6.6a1.5 1.5 0 0 1 0 2.12l-.71.7a1.54 1.54 0 0 1-2.12 0l-.6-.6a5.91 5.91 0 0 1-.58.24v.85A1.5 1.5 0 0 1 8.5 16zm-3.27-3.82.33.18a4.94 4.94 0 0 0 1.07.44l.36.1v1.6a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1.59l.36-.1a4.94 4.94 0 0 0 1.07-.44l.33-.18 1.12 1.12a.51.51 0 0 0 .71 0l.71-.71a.5.5 0 0 0 0-.71l-1.12-1.12.18-.33a4.94 4.94 0 0 0 .44-1.07l.1-.36h1.61a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1.59l-.1-.36a4.94 4.94 0 0 0-.44-1.07l-.18-.33 1.11-1.14a.5.5 0 0 0 0-.71l-.7-.7a.51.51 0 0 0-.71 0l-1.12 1.12-.33-.18a4.94 4.94 0 0 0-1.07-.44L9 3.09V1.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.59l-.36.1a4.94 4.94 0 0 0-1.07.44l-.33.18L4.11 2.7a.51.51 0 0 0-.71 0l-.7.7a.5.5 0 0 0 0 .71l1.12 1.12-.18.33a4.94 4.94 0 0 0-.44 1.07L3.09 7H1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1.59l.1.36a4.94 4.94 0 0 0 .44 1.07l.18.33-1.11 1.13a.5.5 0 0 0 0 .71l.71.71a.51.51 0 0 0 .71 0z"/>
                    </svg>
                  </div>

                {workflowData.actions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground relative z-10">
                    <div className="text-center">
                      <p className="text-lg mb-2">Перетащите действия сюда</p>
                      <p className="text-sm">Выберите действия из палитры слева</p>
                    </div>
                  </div>
                ) : (
                  <SortableContext
                    items={workflowData.actions.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {/* Динамическая раскладка с автоматическим добавлением столбцов слева */}
                    <div className="flex justify-center gap-8 flex-wrap">
                      {(() => {
                        const actions = workflowData.actions;
                        const itemsPerColumn = 5;
                        const totalColumns = Math.ceil(actions.length / itemsPerColumn);

                        // Создаем столбцы слева направо (старые слева, новые справа)
                        return Array.from({ length: totalColumns }, (_, columnIndex) => {
                          const startIndex = columnIndex * itemsPerColumn;
                          const endIndex = Math.min(startIndex + itemsPerColumn, actions.length);
                          const columnActions = actions.slice(startIndex, endIndex);

                          return (
                            <div key={columnIndex} className="flex flex-col gap-6">
                              {columnActions.map((action, localIndex) => {
                                const globalIndex = startIndex + localIndex;
                                const showDownArrow = globalIndex < actions.length - 1 && localIndex < columnActions.length - 1;

                                return (
                                  <div key={action.id} className="relative flex justify-center">
                                    <WorkflowNode
                                      action={action}
                                      index={globalIndex}
                                      onUpdate={handleActionUpdate}
                                      onDelete={handleActionDelete}
                                    />

                                    {/* Стрелка вниз внутри столбца */}
                                    {showDownArrow && (
                                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 opacity-70">
                                        <div className="w-0.5 h-8 bg-primary"></div>
                                        <div className="w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-t-[2px] border-t-primary"></div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </SortableContext>
                )}
              </DropZone>

            </CardContent>
          </Card>

          {/* Кнопка запуска workflow */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => {
                if (!isWorkflowValid) return;
                setShowExecutionMonitor(true);
              }}
              disabled={!isWorkflowValid}
              size="lg"
              className={`px-8 py-3 text-lg font-semibold ${
                !isWorkflowValid
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/90'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              {!isWorkflowValid
                ? (workflowData.actions.length === 0
                    ? (
                        <>
                          <span className="hidden sm:inline">Добавьте действия для запуска</span>
                          <span className="sm:hidden">Добавьте действия</span>
                        </>
                      )
                    : (
                        <>
                          <span className="hidden sm:inline">Заполните все поля действий</span>
                          <span className="sm:hidden">Заполните поля</span>
                        </>
                      ))
                : 'Запустить Workflow'}
            </Button>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения запуска */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подтверждение запуска Workflow</DialogTitle>
            <DialogDescription>
              Проверьте настройки перед запуском workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Тип триггера:</span>
              <Badge variant="outline">
                {workflowData.trigger.type === 'webhook' ? 'Webhook' :
                 workflowData.trigger.type === 'cron' ? 'Cron' :
                 workflowData.trigger.type === 'email' ? 'Email' : 'Неизвестный'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Количество действий:</span>
              <Badge variant="secondary">
                {workflowData.actions.length}
              </Badge>
            </div>

            {workflowData.actions.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Действия:</h4>
                <div className="space-y-1">
                  {workflowData.actions.slice(0, 3).map((action, index) => (
                    <div key={action.id} className="flex items-center justify-between text-xs">
                      <span>{index + 1}. {action.type === 'telegram' ? 'Telegram' :
                                         action.type === 'http' ? 'HTTP' :
                                         action.type === 'email' ? 'Email' :
                                         action.type === 'database' ? 'Database' :
                                         action.type === 'transform' ? 'Transform' : action.type}</span>
                    </div>
                  ))}
                  {workflowData.actions.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      ... и ещё {workflowData.actions.length - 3} действий
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                setShowExecutionMonitor(true);
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              Запустить Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно мониторинга выполнения */}
      <ExecutionMonitorModal
        isOpen={showExecutionMonitor}
        onClose={() => setShowExecutionMonitor(false)}
        onExecute={onSubmit}
        actions={workflowData.actions}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />

    </DndContext>
  );
}
