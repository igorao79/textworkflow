'use client';

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  count?: number;
  onClick?: (actionType: string) => void;
  isMobile?: boolean;
  maxActionsReached?: boolean;
}

function DraggableAction({ action, count, onClick, isMobile = false, maxActionsReached = false }: DraggableActionProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette-${action.id}`,
    data: {
      type: 'palette-item',
      actionType: action.id,
      title: action.title
    }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile && onClick && !maxActionsReached) {
      e.preventDefault();
      e.stopPropagation();
      onClick(action.id);
    }
  };

  return (
    <Card
      ref={maxActionsReached ? undefined : setNodeRef}
      style={maxActionsReached ? {} : style}
      {...(maxActionsReached ? {} : listeners)}
      {...(maxActionsReached ? {} : attributes)}
      className={`${isMobile ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} hover:shadow-md transition-shadow relative ${maxActionsReached ? 'opacity-50 cursor-not-allowed' : ''}`}
      suppressHydrationWarning={true}
      onClick={handleClick}
    >
      {count && count > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {count}
          </Badge>
        </div>
      )}
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

interface ActionPaletteProps {
  actionCounts?: Record<string, number>;
  onAddAction?: (actionType: string) => void;
  isMobile?: boolean;
  maxActionsReached?: boolean;
}

export function ActionPalette({ actionCounts = {}, onAddAction, isMobile = false, maxActionsReached = false }: ActionPaletteProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Действия</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <DraggableAction
              key={action.id}
              action={action}
              count={actionCounts[action.id]}
              onClick={onAddAction}
              isMobile={isMobile}
              maxActionsReached={maxActionsReached}
            />
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
