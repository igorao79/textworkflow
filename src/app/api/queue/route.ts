import { NextRequest, NextResponse } from 'next/server';
import {
  addTask,
  getQueueState,
  pauseQueue,
  resumeQueue,
  clearQueue,
  clearCompletedTasks,
  getTaskStats
} from '@/lib/queue-visualization';

export async function GET() {
  try {
    const queueState = getQueueState();
    const taskStats = getTaskStats();

    return NextResponse.json({
      success: true,
      data: {
        ...queueState,
        taskStats,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении состояния очереди:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось получить состояние очереди',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, priority = 0 } = body;

    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Необходимо указать описание задачи (task)',
        },
        { status: 400 }
      );
    }

    const taskId = addTask(task, priority);

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        message: 'Задача добавлена в очередь',
      },
    });
  } catch (error) {
    console.error('Ошибка при добавлении задачи в очередь:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось добавить задачу в очередь',
      },
      { status: 500 }
    );
  }
}

// PATCH для управления очередью (пауза/возобновление/очистка)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, maxAge } = body;

    switch (action) {
      case 'pause':
        await pauseQueue();
        return NextResponse.json({
          success: true,
          message: 'Очередь приостановлена',
        });

      case 'resume':
        await resumeQueue();
        return NextResponse.json({
          success: true,
          message: 'Очередь возобновлена',
        });

      case 'clear':
        await clearQueue();
        return NextResponse.json({
          success: true,
          message: 'Очередь очищена',
        });

      case 'clear-completed':
        const removedCount = clearCompletedTasks(maxAge);
        return NextResponse.json({
          success: true,
          message: `Удалено ${removedCount} завершенных задач`,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Неизвестное действие. Доступные действия: pause, resume, clear, clear-completed',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Ошибка при управлении очередью:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось выполнить действие с очередью',
      },
      { status: 500 }
    );
  }
}
