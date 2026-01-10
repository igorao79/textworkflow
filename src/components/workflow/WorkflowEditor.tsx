'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkflowAction, WorkflowTrigger } from '@/types/workflow';
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
  onWorkflowChange: (data: any) => void;
}

// Компонент для drop зоны
function DropZone({ children, onDrop }: { children: React.ReactNode, onDrop: () => void }) {
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

export function WorkflowEditor({ workflowData, onWorkflowChange }: WorkflowEditorProps) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // Drag start handled by useSortable in WorkflowNode
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeType = active.data.current?.type;
    const overId = over.id as string;

    // Если перетаскиваем новый action в рабочую область
    if (activeType === 'palette-item' && overId === 'drop-zone') {

      const newAction: WorkflowAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: active.data.current.actionType,
        config: getDefaultConfig(active.data.current.actionType),
        position: { x: 100, y: 100 }
      };

      onWorkflowChange({
        ...workflowData,
        actions: [...workflowData.actions, newAction]
      });
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


  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeType = active.data.current?.type;
    const overId = over.id as string;
    const activeId = active.id as string;

    // Если перетаскиваем новый action в рабочую область
    if (activeType === 'palette-item' && overId === 'drop-zone') {
      // Это обрабатывается в handleDragEnd
      return;
    }

    // Обработка сортировки существующих элементов
    if (activeType === 'workflow-node') {
      const overType = over.data.current?.type;

      if (overType === 'workflow-node' && activeId !== overId) {
        const oldIndex = workflowData.actions.findIndex(action => action.id === activeId);
        const newIndex = workflowData.actions.findIndex(action => action.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newActions = [...workflowData.actions];
          const [movedAction] = newActions.splice(oldIndex, 1);
          newActions.splice(newIndex, 0, movedAction);

          onWorkflowChange({
            ...workflowData,
            actions: newActions
          });
        }
      }
    }
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
          <ActionPalette />
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
              <DropZone onDrop={() => {}}>
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
                    {/* Десктоп версия - 5 колонок */}
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
                              onUpdate={handleActionUpdate}
                              onDelete={handleActionDelete}
                              position={index}
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
                    <div className="hidden lg:grid lg:grid-cols-4 xl:hidden gap-6 justify-items-center relative">
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
                              onUpdate={handleActionUpdate}
                              onDelete={handleActionDelete}
                              position={index}
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

                    {/* Мобильная версия - максимум 8 блоков, по 2 в ряд */}
                    <div className="grid grid-cols-2 gap-6 justify-items-center relative sm:hidden">
                      {workflowData.actions.slice(0, 8).map((action, index) => {
                        const row = Math.floor(index / 2);
                        const isEvenRow = row % 2 === 0;
                        const colInRow = index % 2;
                        const actualCol = isEvenRow ? colInRow : 1 - colInRow;

                        const totalItems = Math.min(workflowData.actions.length, 8);

                        // Определяем направление стрелки
                        let showRightArrow = false;
                        let showLeftArrow = false;
                        let showDownArrow = false;

                        if (index < totalItems - 1) {
                          if (colInRow < 1) {
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
                              order: row * 2 + actualCol
                            }}
                          >
                            <WorkflowNode
                              action={action}
                              onUpdate={handleActionUpdate}
                              onDelete={handleActionDelete}
                              position={index}
                            />

                            {/* Стрелка вправо */}
                            {showRightArrow && (
                              <div className="absolute top-10 -right-3 flex items-center z-10 opacity-70">
                                <div className="w-4 h-0.5 bg-primary"></div>
                                <div className="w-0 h-0 border-l-[2px] border-l-primary border-y-[1px] border-y-transparent"></div>
                              </div>
                            )}

                            {/* Стрелка влево */}
                            {showLeftArrow && (
                              <div className="absolute top-10 -left-3 flex items-center z-10 opacity-70">
                                <div className="w-0 h-0 border-r-[2px] border-r-primary border-y-[1px] border-y-transparent"></div>
                                <div className="w-4 h-0.5 bg-primary"></div>
                              </div>
                            )}

                            {/* Стрелка вниз */}
                            {showDownArrow && (
                              <div className="absolute -bottom-3 left-10 flex flex-col items-center z-10 opacity-70">
                                <div className="w-0.5 h-4 bg-primary"></div>
                                <div className="w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-t-[2px] border-t-primary"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SortableContext>
                )}
              </DropZone>
            </CardContent>
          </Card>
        </div>
      </div>

    </DndContext>
  );
}
