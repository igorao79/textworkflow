'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
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
      className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors ${
        isOver
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/20'
      }`}
    >
      {children}
    </div>
  );
}

export function WorkflowEditor({ workflowData, onWorkflowChange }: WorkflowEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDraggedItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setDraggedItem(null);
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

    setActiveId(null);
    setDraggedItem(null);
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

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Палитра действий */}
        <div className="min-w-0">
          <ActionPalette />
        </div>

        {/* Рабочая область */}
        <div className="min-w-0">
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
              <div className="min-h-[400px] border-2 border-dashed border-border rounded-lg p-4 bg-muted/20">
                {workflowData.actions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg mb-2">Перетащите действия сюда</p>
                      <p className="text-sm">Выберите действия из палитры слева</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-8 py-8">
                    {workflowData.actions.map((action, index) => (
                        <div key={action.id} className="relative flex flex-col items-center">
                          {/* Узел */}
                        <WorkflowNode
                          action={action}
                          onUpdate={handleActionUpdate}
                          onDelete={handleActionDelete}
                          isFirst={index === 0}
                          isLast={index === workflowData.actions.length - 1}
                          position={index !== undefined ? index : 0}
                          key={`node-${action.id}-${index}`}
                        />
                        {/* Debug: показываем index */}
                        <div className="absolute -bottom-6 left-0 bg-red-500 text-white text-xs px-1 rounded">
                          idx:{index}
                        </div>

                        {/* Название действия под узлом */}
                        <div className="mt-2 text-center">
                          <p className="text-xs font-medium text-muted-foreground max-w-20 truncate">
                            {action.type === 'email' ? 'Email' :
                             action.type === 'telegram' ? 'Telegram' :
                             action.type === 'http' ? 'HTTP' :
                             action.type === 'database' ? 'База' :
                             action.type === 'transform' ? 'Трансформ' : 'Действие'}
                          </p>
                        </div>

                        {/* Соединительная стрелка (только между узлами) */}
                        {index < workflowData.actions.length - 1 && (
                          <div className="absolute top-10 -right-16 flex items-center z-10">
                            <div className="w-8 h-0.5 bg-primary"></div>
                            <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[3px] border-y-transparent"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Палитра действий */}
        <div className="min-w-0">
          <ActionPalette />
        </div>

        {/* Рабочая область */}
        <div className="min-w-0">
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
                {workflowData.actions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
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
                    <div className="space-y-4">
                      {workflowData.actions.map((action, index) => (
                        <div key={action.id} className="relative">
                          {/* Соединительная линия */}
                          {index > 0 && (
                            <div className="absolute -top-4 left-10 w-0.5 h-4 bg-primary"></div>
                          )}

                          <WorkflowNode
                            action={action}
                            onUpdate={handleActionUpdate}
                            onDelete={handleActionDelete}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                )}
              </DropZone>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedItem?.type === 'palette-item' ? (
          <Card className="w-48 opacity-80">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary"></div>
                <span className="text-sm font-medium">{draggedItem.title}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
