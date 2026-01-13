// Queue visualization получает данные через API вместо прямого доступа к BullMQ
// Это позволяет работать в serverless среде Vercel

export interface QueueTask {
  id: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  priority?: number;
}

// Функция для получения состояния очереди через API
export async function getQueueState(): Promise<{
  tasks: QueueTask[];
  queueStats: {
    size: number;
    pending: number;
    concurrency: number;
    isPaused: boolean;
    timeout: number;
  };
  taskStats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  };
}> {
  try {
    console.log('📊 getQueueState called via API');

    // Получаем данные через API /api/queue/stats
    const response = await fetch('/api/queue/stats');
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const stats = await response.json();
    console.log('📊 Dashboard: Received queue stats from API:', stats);

    // Преобразуем в формат, ожидаемый компонентом
    const result = {
      tasks: [], // Пустой массив задач для совместимости
      queueStats: {
        size: stats.waiting + stats.active,
        pending: stats.waiting,
        concurrency: 5, // Фиксированное значение
        isPaused: stats.paused,
        timeout: 300000 // 5 минут
      },
      taskStats: {
        pending: stats.waiting,
        running: stats.active,
        completed: stats.completedCount,
        failed: stats.failedCount,
        total: stats.totalJobs
      }
    };

    return result;
  } catch (error) {
    console.warn('❌ Failed to get queue state from API, using fallback:', error);

    // Fallback данные
    return {
      tasks: [],
      queueStats: {
        size: 0,
        pending: 0,
        concurrency: 1,
        isPaused: false,
        timeout: 300000
      },
      taskStats: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        total: 0
      }
    };
  }
}

// Функции-заглушки для обратной совместимости
export function addTask(task: string, priority = 0): string {
  console.warn('⚠️ addTask is deprecated in serverless mode, use BullMQ directly');
  return `stub_${Date.now()}`;
}

export function clearCompletedTasks(maxAge?: number): number {
  console.warn('⚠️ clearCompletedTasks is deprecated in serverless mode');
  return 0;
}