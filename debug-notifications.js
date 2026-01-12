// Отладка проблемы с уведомлениями
console.log('🔍 Отладка системы уведомлений\n');

// Имитация сервиса уведомлений
class MockNotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
  }

  addNotification(data) {
    const notification = {
      ...data,
      timestamp: data.timestamp || new Date(),
      read: false,
    };

    this.notifications.unshift(notification);
    this.notifyListeners();

    console.log('➕ Добавлено уведомление:', notification.title);
    console.log('   Всего уведомлений в сервисе:', this.notifications.length);
  }

  deleteNotification(index) {
    if (this.notifications[index]) {
      console.log('🗑️ Удаляем уведомление:', this.notifications[index].title);
      this.notifications.splice(index, 1);
      this.notifyListeners();
      console.log('   Осталось уведомлений в сервисе:', this.notifications.length);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  getNotifications() {
    return [...this.notifications];
  }
}

const mockService = new MockNotificationService();

// Имитация компонента
let notifications = [];

const unsubscribe = mockService.subscribe((newNotifications) => {
  // Создаем локальные ID как в реальном компоненте
  notifications = newNotifications.map((n, index) => ({
    ...n,
    id: `notification-${Date.now()}-${index}`,
    timestamp: n.timestamp || new Date(),
  }));

  console.log(`📋 Обновление компонента (${notifications.length} уведомлений):`);
  notifications.forEach((n, i) => {
    console.log(`  ${i + 1}. ID: ${n.id.slice(-10)}..., Title: ${n.title}`);
  });
  console.log('');
});

// Имитируем функцию markAsRead из компонента
const markAsRead = (id) => {
  console.log(`👆 markAsRead вызвана для ID: ${id.slice(-10)}...`);

  // Находим уведомление в локальном состоянии по ID
  const localNotification = notifications.find(n => n.id === id);
  console.log('   Найдено локальное уведомление:', localNotification ? localNotification.title : 'НЕ НАЙДЕНО');

  if (localNotification) {
    // Ищем индекс этого уведомления в сервисе
    const serviceNotifications = mockService.getNotifications();
    console.log('   Уведомлений в сервисе:', serviceNotifications.length);

    const serviceIndex = serviceNotifications.findIndex(n =>
      n.title === localNotification.title &&
      n.message === localNotification.message &&
      n.type === localNotification.type &&
      Math.abs((n.timestamp?.getTime() || 0) - (localNotification.timestamp?.getTime() || 0)) < 1000
    );

    console.log('   Найден индекс в сервисе:', serviceIndex);

    if (serviceIndex !== -1) {
      mockService.deleteNotification(serviceIndex);
    } else {
      console.log('❌ Ошибка: индекс в сервисе не найден!');
    }
  }
};

// Тестируем
console.log('🚀 Добавляем тестовые уведомления...\n');

mockService.addNotification({
  type: 'success',
  title: 'Тестовое уведомление 1',
  message: 'Сообщение 1',
});

mockService.addNotification({
  type: 'error',
  title: 'Тестовое уведомление 2',
  message: 'Сообщение 2',
});

// Имитируем клик через 1 секунду
setTimeout(() => {
  console.log('👆 Имитируем клик на первом уведомлении...\n');
  if (notifications.length > 0) {
    markAsRead(notifications[0].id);
  }
}, 1000);

// Завершаем тест
setTimeout(() => {
  console.log('🏁 Тест завершен');
  console.log('Финальное состояние:');
  console.log('  Сервис:', mockService.getNotifications().length, 'уведомлений');
  console.log('  Компонент:', notifications.length, 'уведомлений');
  process.exit(0);
}, 2000);
