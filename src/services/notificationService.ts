import toast from 'react-hot-toast';

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

    const toastOptions = {
      duration: 4000, // Стандартная длительность показа уведомлений
      style: {
        border: '1px solid',
        borderColor: type === 'success' ? '#10b981' :
                     type === 'error' ? '#ef4444' :
                     type === 'warning' ? '#f59e0b' : '#3b82f6',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateX(0)',
        opacity: 1,
      },
      // Настройки анимации для плавного появления справа
      position: 'top-right' as const,
    };

    switch (type) {
      case 'success':
        toast.success(`${title}: ${message}`, toastOptions);
        break;
      case 'error':
        toast.error(`${title}: ${message}`, toastOptions);
        break;
      case 'warning':
        toast(`${title}: ${message}`, { ...toastOptions, icon: '⚠️' });
        break;
      default:
        toast(`${title}: ${message}`, toastOptions);
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
