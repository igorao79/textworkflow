'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bell, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { notificationService, type NotificationData } from '@/services/notificationService';

interface Notification extends NotificationData {
  id: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Инициализируем уведомления при первом рендере
    const initialNotifications = notificationService.getNotifications();
    return initialNotifications.map((n, index) => ({
      ...n,
      id: n.id || `notification-${Date.now()}-${index}`,
      timestamp: n.timestamp || new Date(),
      read: n.read !== undefined ? n.read : false,
    }));
  });
  const [isOpen, setIsOpen] = useState(false);

  // Подписываемся на изменения уведомлений
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      const formattedNotifications: Notification[] = newNotifications.map((n, index) => ({
        ...n,
        id: n.id || `notification-${Date.now()}-${index}`,
        timestamp: n.timestamp || new Date(),
        read: n.read !== undefined ? n.read : false,
      }));
      setNotifications(formattedNotifications);
    });

    return unsubscribe;
  }, []);

  // Вычисляем количество непрочитанных уведомлений
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    // Находим индекс в массиве сервиса по ID
    const serviceNotifications = notificationService.getNotifications();
    const serviceIndex = serviceNotifications.findIndex(n => n.id === id);
    if (serviceIndex !== -1) {
      notificationService.markAsRead(serviceIndex);
    }
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const deleteNotification = (id: string) => {
    // Находим индекс в массиве сервиса по ID
    const serviceNotifications = notificationService.getNotifications();
    const serviceIndex = serviceNotifications.findIndex(n => n.id === id);
    if (serviceIndex !== -1) {
      notificationService.deleteNotification(serviceIndex);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} д назад`;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative gap-2"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Уведомления</span>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  Отметить все прочитанными
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Отчеты о выполнении workflow и системные уведомления
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.filter(notification => !notification.read).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      !notification.read
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-card border-border'
                    } hover:bg-muted/50`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                              {notification.type === 'success' ? 'Успешно' :
                               notification.type === 'error' ? 'Ошибка' :
                               notification.type === 'warning' ? 'Предупреждение' : 'Инфо'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          {(notification.workflowId || notification.workflowName) && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {notification.workflowId && `ID: ${notification.workflowId}`}
                              {notification.workflowId && notification.workflowName && ' • '}
                              {notification.workflowName && notification.workflowName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
