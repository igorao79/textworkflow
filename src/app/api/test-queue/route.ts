import { NextResponse } from 'next/server';
import { addTask } from '@/lib/queue-visualization';

// Тестовый endpoint для демонстрации работы очереди
export async function POST() {
  try {
    // Добавляем несколько тестовых задач разных типов
    const tasks = [
      'Выполнение workflow: обработка данных пользователя',
      'Отправка уведомления по email',
      'Вызов API внешнего сервиса',
      'Генерация отчета по аналитике',
      'Обновление кэша приложения',
    ];

    const taskIds = tasks.map(task => addTask(task));

    return NextResponse.json({
      success: true,
      message: `Добавлено ${taskIds.length} тестовых задач в очередь`,
      taskIds,
    });
  } catch (error) {
    console.error('Ошибка при добавлении тестовых задач:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось добавить тестовые задачи',
      },
      { status: 500 }
    );
  }
}
