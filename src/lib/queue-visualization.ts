import PQueue from 'p-queue';

// Импорт fs только на сервере
let fs: any, path: any;
if (typeof window === 'undefined') {
  try {
    fs = require('fs');
    path = require('path');
  } catch (e) {
    // fs не доступен
  }
}

export interface QueueTask {
  id: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  priority?: number;
}

// Создаем экземпляр PQueue с настройками
const queue = new PQueue({
  concurrency: 2, // Максимум 2 задачи одновременно
  timeout: 30000, // Таймаут 30 секунд
  throwOnTimeout: false, // Не выбрасывать ошибку при таймауте
});

// Массив для отслеживания состояния задач
let queueState: QueueTask[] = [];

// Функции для сохранения и загрузки состояния (только на сервере)
function saveQueueState() {
  if (typeof window !== 'undefined' || !fs) return; // Не работать на клиенте или если fs не доступен

  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const PQUEUE_FILE = path.join(DATA_DIR, 'pqueue.json');

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Преобразуем Date объекты в числа для JSON сериализации
    const serializableState = queueState.map(task => ({
      ...task,
      startTime: task.startTime instanceof Date ? task.startTime.getTime() : task.startTime,
      endTime: task.endTime instanceof Date ? task.endTime.getTime() : task.endTime,
    }));

    fs.writeFileSync(PQUEUE_FILE, JSON.stringify(serializableState, null, 2));
  } catch (error) {
    console.error('Failed to save PQueue state:', error);
  }
}

function loadQueueState() {
  if (typeof window !== 'undefined' || !fs) return; // Не работать на клиенте или если fs не доступен

  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const PQUEUE_FILE = path.join(DATA_DIR, 'pqueue.json');

    if (fs.existsSync(PQUEUE_FILE)) {
      const data = fs.readFileSync(PQUEUE_FILE, 'utf8');
      const loadedTasks = JSON.parse(data);

      // Преобразуем timestamp'ы обратно в Date объекты
      queueState = loadedTasks.map((task: any) => ({
        ...task,
        startTime: task.startTime ? new Date(task.startTime) : undefined,
        endTime: task.endTime ? new Date(task.endTime) : undefined,
      }));

      console.log(`Loaded ${queueState.length} tasks from PQueue state file`);
    }
  } catch (error) {
    console.error('Failed to load PQueue state:', error);
    queueState = [];
  }
}

// Загружаем состояние при импорте (только на сервере)
loadQueueState();

// Генератор уникальных ID для задач
let taskCounter = 0;
function generateTaskId(): string {
  return `task-${++taskCounter}-${Date.now()}`;
}

// Функция для добавления задачи в очередь
export function addTask(taskDescription: string, priority: number = 0): string {
  const taskId = generateTaskId();

  const taskObj: QueueTask = {
    id: taskId,
    task: taskDescription,
    status: 'pending',
    priority,
  };

  // Добавляем задачу в состояние
  queueState.push(taskObj);
  saveQueueState();

  console.log(`📋 Добавлена задача: ${taskDescription} (ID: ${taskId})`);

  // Добавляем задачу в PQueue
  queue.add(async () => {
    try {
      // Обновляем статус на "running"
      taskObj.status = 'running';
      taskObj.startTime = Date.now();
      saveQueueState();

      console.log(`▶️ Выполняется задача: ${taskDescription}`);

      // Имитируем выполнение задачи (в реальном приложении здесь будет логика workflow)
      await simulateTaskExecution(taskDescription);

      // Обновляем статус на "completed"
      taskObj.status = 'completed';
      taskObj.endTime = Date.now();
      saveQueueState();

      console.log(`✅ Завершена задача: ${taskDescription}`);

    } catch (error) {
      // Обновляем статус на "failed"
      taskObj.status = 'failed';
      taskObj.endTime = Date.now();
      taskObj.error = error instanceof Error ? error.message : 'Unknown error';
      saveQueueState();

      console.error(`❌ Ошибка в задаче: ${taskDescription}`, error);
    }
  }, { id: taskId, priority });

  return taskId;
}

// Функция для симуляции выполнения задачи
async function simulateTaskExecution(taskDescription: string): Promise<void> {
  // Имитируем различное время выполнения для разных типов задач
  let delay: number;

  if (taskDescription.includes('workflow')) {
    delay = Math.random() * 5000 + 2000; // 2-7 секунд для workflow
  } else if (taskDescription.includes('notification')) {
    delay = Math.random() * 1000 + 500; // 0.5-1.5 секунды для уведомлений
  } else if (taskDescription.includes('api')) {
    delay = Math.random() * 3000 + 1000; // 1-4 секунды для API вызовов
  } else {
    delay = Math.random() * 2000 + 1000; // 1-3 секунды по умолчанию
  }

  // Имитируем случайную вероятность ошибки (5%)
  if (Math.random() < 0.05) {
    throw new Error(`Симуляция ошибки выполнения: ${taskDescription}`);
  }

  await new Promise(resolve => setTimeout(resolve, delay));
}

// Функция для получения текущего состояния очереди
// Кэш для предотвращения ненужных пересозданий объектов
let lastQueueState: any = null;
let lastResult: any = null;

export function getQueueState(): {
  tasks: QueueTask[];
  queueStats: {
    size: number; // Количество задач в очереди
    pending: number; // Количество выполняющихся задач
    concurrency: number; // Максимальная параллельность
    isPaused: boolean; // Очередь приостановлена
    timeout: number; // Таймаут задач
  };
  taskStats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  };
} {
  // Проверяем, изменилось ли состояние очереди
  const currentState = {
    queueLength: queueState.length,
    queueSize: queue.size,
    queuePending: queue.pending,
    queueIsPaused: queue.isPaused,
    taskStatuses: queueState.map(t => ({ id: t.id, status: t.status }))
  };

  const stateChanged = !lastQueueState || JSON.stringify(lastQueueState) !== JSON.stringify(currentState);

  if (!stateChanged && lastResult) {
    // Возвращаем кэшированный результат, если состояние не изменилось
    return lastResult;
  }

  console.log('getQueueState called, queueState length:', queueState.length);

  // Подсчитываем статистику задач
  const taskStats = queueState.reduce(
    (stats, task) => {
      stats[task.status]++;
      stats.total++;
      return stats;
    },
    { pending: 0, running: 0, completed: 0, failed: 0, total: 0 }
  );

  console.log('getQueueState taskStats:', taskStats);

  const result = {
    tasks: [...queueState], // Возвращаем копию массива
    queueStats: {
      size: queue.size,
      pending: queue.pending,
      concurrency: queue.concurrency,
      isPaused: queue.isPaused,
      timeout: queue.timeout || 0,
    },
    taskStats,
  };

  // Кэшируем результат
  lastQueueState = currentState;
  lastResult = result;

  return result;
}

// Функция для очистки завершенных задач (старше определенного времени)
export function clearCompletedTasks(maxAge: number = 5 * 60 * 1000): number { // 5 минут по умолчанию
  const now = Date.now();
  const initialLength = queueState.length;

  // Удаляем завершенные задачи старше maxAge
  const filteredTasks = queueState.filter(task => {
    if (task.status === 'completed' || task.status === 'failed') {
      return task.endTime && (now - task.endTime) < maxAge;
    }
    return true; // Оставляем активные и ожидающие задачи
  });

  const removedCount = initialLength - filteredTasks.length;

  // Заменяем массив отфильтрованными задачами
  queueState.splice(0, queueState.length, ...filteredTasks);

  console.log(`🧹 Очищено ${removedCount} завершенных задач`);
  return removedCount;
}

// Функции управления очередью
export async function pauseQueue(): Promise<void> {
  await queue.pause();
  console.log('⏸️ Очередь приостановлена');
}

export async function resumeQueue(): Promise<void> {
  await queue.resume();
  console.log('▶️ Очередь возобновлена');
}

export async function clearQueue(): Promise<void> {
  await queue.clear();
  queueState.length = 0; // Очищаем состояние
  console.log('🗑️ Очередь очищена');
}

// Функция для получения статистики по статусам задач
export function getTaskStats(): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
} {
  const stats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: queueState.length,
  };

  queueState.forEach(task => {
    stats[task.status]++;
  });

  return stats;
}

// Настройка событий для логирования
queue.on('active', () => {
  console.log(`🔄 Активных задач: ${queue.pending}, в очереди: ${queue.size}`);
});

queue.on('completed', (result) => {
  console.log(`✅ Задача завершена успешно`);
});

queue.on('error', (error) => {
  console.error(`❌ Ошибка выполнения задачи:`, error);
});

queue.on('idle', () => {
  console.log(`🏁 Все задачи выполнены`);
});

// Экспорт экземпляра очереди для продвинутого использования
export { queue };
