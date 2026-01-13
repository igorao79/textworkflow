import { toast } from 'sonner';

export interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  workflowId?: string;
  workflowName?: string;
  timestamp?: Date;
  read?: boolean;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  // Отправка toast уведомления
  sendToast(data: NotificationData) {
    const { type, title, message } = data;

    // Создаем сообщение с красивым форматированием
    const fullMessage = `${title}: ${message}`;

    switch (type) {
      case 'success':
        toast.success(fullMessage, {
          duration: 4000,
          icon: null,
          style: {
            border: '1px solid #10b981',
            borderRadius: '8px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '500',
          },
        });
        break;
      case 'error':
        toast.error(fullMessage, {
          duration: 4000,
          icon: null,
          style: {
            border: '1px solid #ef4444',
            borderRadius: '8px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '500',
          },
        });
        break;
      case 'warning':
        toast.warning(fullMessage, {
          duration: 4000,
          icon: null,
          style: {
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '500',
          },
        });
        break;
      default:
        toast.info(fullMessage, {
          duration: 4000,
          icon: null,
          style: {
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '500',
          },
        });
    }
  }

  // Добавление уведомления в список (для модалки)
  addNotification(data: NotificationData) {
    const notification = {
      ...data,
      timestamp: data.timestamp || new Date(),
      read: data.read !== undefined ? data.read : false,
    };

    this.notifications.unshift(notification);

    // Ограничиваем количество уведомлений (максимум 50)
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Уведомляем слушателей
    this.notifyListeners();

    // Отправляем toast
    this.sendToast(data);
  }

  // Получение всех уведомлений
  getNotifications() {
    return [...this.notifications];
  }

  // Отметить уведомление как прочитанное
  markAsRead(index: number) {
    if (this.notifications[index]) {
      this.notifications[index].read = true;
      this.notifyListeners();
    }
  }

  // Отметить все как прочитанные
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Удалить уведомление
  deleteNotification(index: number) {
    this.notifications.splice(index, 1);
    this.notifyListeners();
  }

  // Подписка на изменения
  subscribe(listener: (notifications: NotificationData[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationService = new NotificationService();

// Вспомогательные функции для быстрой отправки уведомлений
export const notifySuccess = (title: string, message: string, workflowId?: string, workflowName?: string) => {
  notificationService.addNotification({
    type: 'success',
    title,
    message,
    workflowId,
    workflowName,
  });
};

export const notifyError = (title: string, message: string, workflowId?: string, workflowName?: string) => {
  notificationService.addNotification({
    type: 'error',
    title,
    message,
    workflowId,
    workflowName,
  });
};

export const notifyWarning = (title: string, message: string, workflowId?: string, workflowName?: string) => {
  notificationService.addNotification({
    type: 'warning',
    title,
    message,
    workflowId,
    workflowName,
  });
};

export const notifyInfo = (title: string, message: string, workflowId?: string, workflowName?: string) => {
  notificationService.addNotification({
    type: 'info',
    title,
    message,
    workflowId,
    workflowName,
  });
};
