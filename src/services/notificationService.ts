import toast from 'react-hot-toast';

export interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  workflowId?: string;
  workflowName?: string;
  timestamp?: Date;
  read?: boolean;
  id?: string;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  // Отправка toast уведомления
  sendToast(data: NotificationData) {
    const { type, title, message, workflowId, workflowName } = data;

    // Формируем сообщение с ID и именем workflow если они есть
    const fullTitle = workflowId && workflowName
      ? `${title} (ID: ${workflowId}, ${workflowName})`
      : title;

    const toastOptions = {
      duration: 5000,
      style: {
        border: '1px solid',
        borderColor: type === 'success' ? '#10b981' :
                     type === 'error' ? '#ef4444' :
                     type === 'warning' ? '#f59e0b' : '#3b82f6',
      },
    };

    switch (type) {
      case 'success':
        toast.success(`${fullTitle}: ${message}`, toastOptions);
        break;
      case 'error':
        toast.error(`${fullTitle}: ${message}`, toastOptions);
        break;
      case 'warning':
        toast(`${fullTitle}: ${message}`, {
          ...toastOptions,
          icon: '⚠️'
        });
        break;
      default:
        toast(`${fullTitle}: ${message}`, toastOptions);
    }
  }

  // Добавление уведомления в список (для модалки)
  addNotification(data: NotificationData) {
    const notification = {
      ...data,
      id: data.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
