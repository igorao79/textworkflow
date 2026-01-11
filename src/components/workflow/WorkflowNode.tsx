'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { WorkflowAction, EmailActionConfig, TelegramActionConfig, HttpActionConfig, DatabaseActionConfig, TransformActionConfig } from '@/types/workflow';
import { Trash2, Settings, Mail, Send, Globe, Database, RefreshCw, Wrench } from 'lucide-react';

// Вспомогательные функции для иконок и названий
export const getActionIcon = (type: string) => {
  switch (type) {
    case 'email': return Mail;
    case 'telegram': return Send;
    case 'http': return Globe;
    case 'database': return Database;
    case 'transform': return RefreshCw;
    default: return Wrench;
  }
};

export const getActionTitle = (type: string) => {
  switch (type) {
    case 'email': return 'Отправить Email';
    case 'telegram': return 'Отправить Telegram';
    case 'http': return 'HTTP запрос';
    case 'database': return 'База данных';
    case 'transform': return 'Трансформация';
    default: return 'Действие';
  }
};

interface WorkflowNodeProps {
  action: WorkflowAction;
  index?: number;
  onUpdate: (actionId: string, updates: Partial<WorkflowAction>) => void;
  onDelete: (actionId: string) => void;
}

export function WorkflowNode({ action, index, onUpdate, onDelete }: WorkflowNodeProps) {
  const [tempConfig, setTempConfig] = React.useState(action.config);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Обновляем tempConfig при изменении action.config
  React.useEffect(() => {
    setTempConfig(action.config);
  }, [action.config]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: action.id,
    data: {
      type: 'workflow-node',
      action
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
  };


  const handleSave = () => {
    onUpdate(action.id, { config: tempConfig });
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setTempConfig(action.config); // Сбрасываем изменения
    setIsDialogOpen(false);
  };

  const updateTempConfig = (updates: Partial<EmailActionConfig | TelegramActionConfig | HttpActionConfig | DatabaseActionConfig | TransformActionConfig>) => {
    setTempConfig(prev => ({ ...prev, ...updates }));
  };

  const renderActionConfig = () => {
    switch (action.type) {
      case 'email':
        const emailConfig = tempConfig as EmailActionConfig;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`email-from-${action.id}`} className="mb-2 block">Отправитель (опционально)</Label>
              <Input
                id={`email-from-${action.id}`}
                value={emailConfig.from || ''}
                onChange={(e) => updateTempConfig({ from: e.target.value })}
                placeholder="noreply@your-verified-domain.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Оставьте пустым для использования домена Resend
              </p>
            </div>
            <div>
              <Label htmlFor={`email-to-${action.id}`} className="mb-2 block">Получатель (опционально)</Label>
              <Input
                id={`email-to-${action.id}`}
                value={emailConfig.to || ''}
                onChange={(e) => updateTempConfig({ to: e.target.value })}
                placeholder="Оставьте пустым для использования email из формы"
              />
            </div>
            <div>
              <Label htmlFor={`email-subject-${action.id}`} className="mb-2 block">Тема</Label>
              <Input
                id={`email-subject-${action.id}`}
                value={emailConfig.subject || ''}
                onChange={(e) => updateTempConfig({ subject: e.target.value })}
                placeholder="Тема письма"
              />
            </div>
            <div>
              <Label htmlFor={`email-body-${action.id}`} className="mb-2 block">Текст</Label>
              <Textarea
                id={`email-body-${action.id}`}
                value={emailConfig.body || ''}
                onChange={(e) => updateTempConfig({ body: e.target.value })}
                placeholder="Текст письма"
                rows={3}
              />
            </div>
          </div>
        );

      case 'telegram':
        const telegramConfig = tempConfig as TelegramActionConfig;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`telegram-message-${action.id}`} className="mb-2 block">Сообщение (опционально)</Label>
              <Textarea
                id={`telegram-message-${action.id}`}
                value={telegramConfig.message || ''}
                onChange={(e) => updateTempConfig({ message: e.target.value })}
                placeholder="Оставьте пустым, чтобы использовать сообщение из формы"
                rows={2}
              />
            </div>
          </div>
        );

      case 'http':
        const httpConfig = tempConfig as HttpActionConfig;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`http-method-${action.id}`} className="mb-2 block">Метод</Label>
                <Select
                  value={httpConfig.method || 'GET'}
                  onValueChange={(value) => updateTempConfig({ method: value as HttpActionConfig['method'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={`http-url-${action.id}`} className="mb-2 block">URL</Label>
                <Input
                  id={`http-url-${action.id}`}
                  value={httpConfig.url || ''}
                  onChange={(e) => updateTempConfig({ url: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
          </div>
        );

      case 'database':
        const dbConfig = tempConfig as DatabaseActionConfig;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`db-operation-${action.id}`} className="mb-2 block">Операция</Label>
              <Select
                value={dbConfig.operation || 'select'}
                onValueChange={(value) => updateTempConfig({ operation: value as DatabaseActionConfig['operation'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">SELECT</SelectItem>
                  <SelectItem value="insert">INSERT</SelectItem>
                  <SelectItem value="update">UPDATE</SelectItem>
                  <SelectItem value="delete">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`db-table-${action.id}`} className="mb-2 block">Таблица</Label>
              <Input
                id={`db-table-${action.id}`}
                value={dbConfig.table || ''}
                onChange={(e) => updateTempConfig({ table: e.target.value })}
                placeholder="users"
              />
            </div>
          </div>
        );

      case 'transform':
        const transformConfig = tempConfig as TransformActionConfig;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`transform-input-${action.id}`} className="mb-2 block">Входные данные</Label>
              <Input
                id={`transform-input-${action.id}`}
                value={transformConfig.input || ''}
                onChange={(e) => updateTempConfig({ input: e.target.value })}
                placeholder="data.email"
              />
            </div>
            <div>
              <Label htmlFor={`transform-code-${action.id}`} className="mb-2 block">Код трансформации</Label>
              <Textarea
                id={`transform-code-${action.id}`}
                value={transformConfig.transformation || ''}
                onChange={(e) => updateTempConfig({ transformation: e.target.value })}
                placeholder="return data.toUpperCase()"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor={`transform-output-${action.id}`} className="mb-2 block">Выходная переменная</Label>
              <Input
                id={`transform-output-${action.id}`}
                value={transformConfig.output || ''}
                onChange={(e) => updateTempConfig({ output: e.target.value })}
                placeholder="transformedData"
              />
            </div>
          </div>
        );

      default:
        return <p>Настройки для этого действия недоступны</p>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
      {...attributes}
    >
      {/* Основной квадратный узел */}
      <div
        className={`
          relative w-20 h-20 bg-card border-2 border-border rounded-lg shadow-sm cursor-move
          flex flex-col items-center justify-center gap-1
          hover:shadow-md hover:border-primary transition-all duration-200 group
          ${isDragging ? 'shadow-lg scale-110 border-primary' : ''}
        `}
        {...listeners}
      >
        {/* Номер задачи */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 border-card">
          {index !== undefined ? index + 1 : action.id.split('_').pop() || '?'}
        </div>


        {/* Иконка действия */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          {React.createElement(getActionIcon(action.type), { className: "w-4 h-4" })}
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDialogOpen(true);
                }}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
              <DialogHeader>
                <DialogTitle>{getActionTitle(action.type)}</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto px-3">
                {renderActionConfig()}
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button onClick={handleSave}>
                  Сохранить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 text-destructive hover:text-destructive hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(action.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

      </div>

    </div>
  );
}
