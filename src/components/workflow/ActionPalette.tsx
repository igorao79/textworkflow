'use client';

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, Globe, Database, RefreshCw } from 'lucide-react';

const actions = [
  {
    id: 'email',
    title: 'Отправить Email',
    description: 'Отправка email через Resend',
    icon: Mail,
    color: 'bg-red-600'
  },
  {
    id: 'telegram',
    title: 'Отправить Telegram',
    description: 'Отправка сообщения в Telegram',
    icon: Send,
    color: 'bg-red-500'
  },
  {
    id: 'http',
    title: 'HTTP запрос',
    description: 'Выполнение HTTP запроса',
    icon: Globe,
    color: 'bg-red-700'
  },
  {
    id: 'database',
    title: 'База данных',
    description: 'Операции с базой данных',
    icon: Database,
    color: 'bg-red-800'
  },
  {
    id: 'transform',
    title: 'Трансформация',
    description: 'Преобразование данных',
    icon: RefreshCw,
    color: 'bg-red-400'
  }
];

interface Action {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface DraggableActionProps {
  action: Action;
}

function DraggableAction({ action }: DraggableActionProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${action.id}`,
    data: {
      type: 'palette-item',
      actionType: action.id,
      title: action.title
    }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center text-white`}>
            <action.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm break-words">{action.title}</h4>
            <p className="text-xs text-muted-foreground break-words">{action.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActionPalette() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Действия</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <DraggableAction key={action.id} action={action} />
          ))}
        </div>
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
            Перетащите действия в рабочую область для добавления в workflow
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
