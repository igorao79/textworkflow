'use client';

import React, { useRef, useState, useEffect } from 'react';
import { getActionTitle } from './WorkflowNode';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WorkflowAction, WorkflowTrigger, EmailActionConfig, TelegramActionConfig, HttpActionConfig, DatabaseActionConfig, TransformActionConfig } from '@/types/workflow';
import { WorkflowNode } from './WorkflowNode';
import { ActionPalette } from './ActionPalette';
import { TriggerSelector } from './TriggerSelector';

interface WorkflowEditorProps {
  workflowData: {
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
  };
  onWorkflowChange: (data: WorkflowEditorProps['workflowData']) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

// Компонент для отображения выполнения workflow
function ExecutionMonitorModal({
  isOpen,
  onClose,
  onExecute,
  actions,
  isSubmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  onExecute?: () => void;
  actions: WorkflowAction[];
  isSubmitting?: boolean;
}) {
  const [, setCurrentStep] = useState(0);
  const [executionSteps, setExecutionSteps] = useState<Array<{
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
  }>>([]);

  // Инициализируем шаги выполнения при открытии модального окна
  React.useEffect(() => {
    if (isOpen && actions.length > 0) {
      const steps = actions.map(action => ({
        id: action.id,
        title: getActionTitle(action.type),
        status: 'pending' as const
      }));
      setExecutionSteps(steps);
      setCurrentStep(0);

      // Не запускаем автоматически - пользователь сам нажмет кнопку в модалке

      // Имитируем выполнение шагов
      let stepIndex = 0;
      const executeStep = () => {
        if (stepIndex < steps.length) {
          setExecutionSteps(prev => prev.map((step, index) => {
            if (index === stepIndex) {
              return { ...step, status: 'running', startTime: new Date() };
            }
            return step;
          }));

          // Имитируем время выполнения (случайное от 1 до 3 секунд)
          const executionTime = Math.random() * 2000 + 1000;

          setTimeout(() => {
            setExecutionSteps(prev => prev.map((step, index) => {
              if (index === stepIndex) {
                return { ...step, status: 'completed', endTime: new Date() };
              }
              return step;
            }));

            stepIndex++;
            setCurrentStep(stepIndex);

            if (stepIndex < steps.length) {
              setTimeout(executeStep, 500); // Пауза между шагами
            } else {
              // Все шаги завершены, закрываем модальное окно через 2 секунды
              setTimeout(() => {
                onClose();
              }, 2000);
            }
          }, executionTime);
        }
      };

      setTimeout(executeStep, 1000); // Начинаем через 1 секунду
    }
  }, [isOpen, actions, onExecute, onClose]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Выполнено';
      case 'running': return 'Выполняется...';
      case 'failed': return 'Ошибка';
      default: return 'Ожидает';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle>Мониторинг выполнения Workflow</DialogTitle>
          <DialogDescription>
            Отслеживание прогресса выполнения каждого шага workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {executionSteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Подготовка к выполнению...</p>
              <Button
                onClick={onExecute}
                disabled={isSubmitting}
                className="mt-4"
                size="lg"
              >
                {isSubmitting ? 'Запуск...' : 'Запустить Workflow'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {executionSteps.map((step) => (
                <div key={step.id} className="flex items-center space-x-3 p-4 border rounded-lg bg-card">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(step.status)}`}></div>
                  <div className="flex-1">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-muted-foreground">{getStatusText(step.status)}</div>
                    {step.startTime && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Начало: {step.startTime.toLocaleTimeString()}
                        {step.endTime && ` • Завершение: ${step.endTime.toLocaleTimeString()}`}
                      </div>
                    )}
                  </div>
                  {step.status === 'running' && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                  {step.status === 'completed' && (
                    <div className="text-green-600">✓</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Закрыть
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


export function WorkflowEditor({ workflowData, onWorkflowChange, onSubmit, isSubmitting }: WorkflowEditorProps) {
  const actionCounterRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showExecutionMonitor, setShowExecutionMonitor] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Подсчет количества действий каждого типа
  const actionCounts = workflowData.actions.reduce((counts, action) => {
    counts[action.type] = (counts[action.type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Проверка валидности всех действий
  const isWorkflowValid = React.useMemo(() => {
    if (workflowData.actions.length === 0) return false;

    return workflowData.actions.every(action => {
      switch (action.type) {
        case 'email':
          const emailConfig = action.config as EmailActionConfig;
          return emailConfig.to && emailConfig.subject && emailConfig.body;
        case 'telegram':
          const telegramConfig = action.config as TelegramActionConfig;
          return telegramConfig.message;
        case 'http':
          const httpConfig = action.config as HttpActionConfig;
          return httpConfig.url && httpConfig.method;
        case 'database':
          const dbConfig = action.config as DatabaseActionConfig;
          return dbConfig.operation && dbConfig.table;
        case 'transform':
          const transformConfig = action.config as TransformActionConfig;
          return transformConfig.input && transformConfig.transformation && transformConfig.output;
        default:
          return false;
      }
    });
  }, [workflowData.actions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
        return { to: '', subject: '', body: '' };
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
                  <>
                    {/* Desktop версии с rect sorting */}
                    <div className="hidden lg:block">
                      <SortableContext
                        items={workflowData.actions.map(a => a.id)}
                        strategy={rectSortingStrategy}
                      >
                        {/* Desktop версия - 5 колонок */}
                        <div className="hidden xl:grid xl:grid-cols-5 gap-6 justify-items-center relative">
                          {workflowData.actions.map((action, index) => {
                            const row = Math.floor(index / 5);
                            const isEvenRow = row % 2 === 0;
                            const colInRow = index % 5;
                            const visualCol = isEvenRow ? colInRow : 4 - colInRow;

                            const totalItems = workflowData.actions.length;

                            // Определяем направление стрелки
                            let showRightArrow = false;
                            let showLeftArrow = false;
                            let showDownArrow = false;

                            if (index < totalItems - 1) {
                              if (colInRow < 4) {
                                // Не последний в ряду
                                if (isEvenRow) {
                                  // Четный ряд - стрелка вправо
                                  showRightArrow = true;
                                } else {
                                  // Нечетный ряд - стрелка влево
                                  showLeftArrow = true;
                                }
                              } else {
                                // Последний в ряду - стрелка вниз (если есть следующий ряд)
                                showDownArrow = true;
                              }
                            }

                            return (
                              <div
                                key={action.id}
                                className="relative"
                                style={{
                                  gridRow: row + 1,
                                  gridColumn: visualCol + 1
                                }}
                              >
                                <WorkflowNode
                                  action={action}
                                  index={index}
                                  onUpdate={handleActionUpdate}
                                  onDelete={handleActionDelete}
                                />

                                {/* Стрелка вправо */}
                                {showRightArrow && (
                                  <div className="absolute top-10 -right-5 flex items-center z-10 opacity-70">
                                    <div className="w-5 h-0.5 bg-primary"></div>
                                    <div className="w-0 h-0 border-l-[2px] border-l-primary border-y-[2px] border-y-transparent"></div>
                                  </div>
                                )}

                                {/* Стрелка влево */}
                                {showLeftArrow && (
                                  <div className="absolute top-10 -left-5 flex items-center z-10 opacity-70">
                                    <div className="w-0 h-0 border-r-[2px] border-r-primary border-y-[2px] border-y-transparent"></div>
                                    <div className="w-5 h-0.5 bg-primary"></div>
                                  </div>
                                )}

                                {/* Стрелка вниз */}
                                {showDownArrow && (
                                  <div className="absolute -bottom-6 left-10 flex flex-col items-center z-10 opacity-70">
                                    <div className="w-0.5 h-6 bg-primary"></div>
                                    <div className="w-0 h-0 border-l-[1.5px] border-l-transparent border-r-[1.5px] border-r-transparent border-t-[3px] border-t-primary"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* LG версия - 4 колонки */}
                        <div className="grid lg:grid-cols-4 xl:hidden gap-6 justify-items-center relative">
                          {workflowData.actions.map((action, index) => {
                            const row = Math.floor(index / 4);
                            const isEvenRow = row % 2 === 0;
                            const colInRow = index % 4;
                            const visualCol = isEvenRow ? colInRow : 3 - colInRow;

                            const totalItems = workflowData.actions.length;

                            // Определяем направление стрелки
                            let showRightArrow = false;
                            let showLeftArrow = false;
                            let showDownArrow = false;

                            if (index < totalItems - 1) {
                              if (colInRow < 3) {
                                // Не последний в ряду
                                if (isEvenRow) {
                                  // Четный ряд - стрелка вправо
                                  showRightArrow = true;
                                } else {
                                  // Нечетный ряд - стрелка влево
                                  showLeftArrow = true;
                                }
                              } else {
                                // Последний в ряду - стрелка вниз (если есть следующий ряд)
                                showDownArrow = true;
                              }
                            }

                            return (
                              <div
                                key={action.id}
                                className="relative"
                                style={{
                                  gridRow: row + 1,
                                  gridColumn: visualCol + 1
                                }}
                              >
                                <WorkflowNode
                                  action={action}
                                  index={index}
                                  onUpdate={handleActionUpdate}
                                  onDelete={handleActionDelete}
                                />

                                {/* Стрелка вправо */}
                                {showRightArrow && (
                                  <div className="absolute top-10 -right-4 flex items-center z-10 opacity-70">
                                    <div className="w-4 h-0.5 bg-primary"></div>
                                    <div className="w-0 h-0 border-l-[2px] border-l-primary border-y-[1px] border-y-transparent"></div>
                                  </div>
                                )}

                                {/* Стрелка влево */}
                                {showLeftArrow && (
                                  <div className="absolute top-10 -left-4 flex items-center z-10 opacity-70">
                                    <div className="w-0 h-0 border-r-[2px] border-r-primary border-y-[1px] border-y-transparent"></div>
                                    <div className="w-4 h-0.5 bg-primary"></div>
                                  </div>
                                )}

                                {/* Стрелка вниз */}
                                {showDownArrow && (
                                  <div className="absolute -bottom-5 left-10 flex flex-col items-center z-10 opacity-70">
                                    <div className="w-0.5 h-5 bg-primary"></div>
                                    <div className="w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-t-[2px] border-t-primary"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </SortableContext>
                    </div>

                    {/* Мобильная версия - вертикальный список */}
                    <div className="lg:hidden">
                      <SortableContext
                        items={workflowData.actions.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-6">
                          {workflowData.actions.map((action, index) => (
                            <div key={action.id} className="relative flex justify-center">
                              <WorkflowNode
                                action={action}
                                index={index}
                                onUpdate={handleActionUpdate}
                                onDelete={handleActionDelete}
                              />

                              {/* Стрелка вниз для мобильной версии */}
                              {index < workflowData.actions.length - 1 && (
                                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 opacity-70">
                                  <div className="w-0.5 h-8 bg-primary"></div>
                                  <div className="w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-t-[2px] border-t-primary"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  </>
                )}
              </DropZone>

              {/* Кнопка запуска */}
              {onSubmit && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={() => setShowExecutionMonitor(true)}
                    disabled={isSubmitting || !isWorkflowValid}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold"
                  >
                    {isSubmitting ? 'Запуск...' : 'Запустить Workflow'}
                  </Button>
                  {!isWorkflowValid && workflowData.actions.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Заполните все поля действий для запуска workflow
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Модальное окно мониторинга выполнения */}
      <ExecutionMonitorModal
        isOpen={showExecutionMonitor}
        onClose={() => setShowExecutionMonitor(false)}
        onExecute={onSubmit}
        actions={workflowData.actions}
        isSubmitting={isSubmitting}
      />

    </DndContext>
  );
}
