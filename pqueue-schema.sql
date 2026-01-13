-- Создание таблицы для PQueue задач (для dashboard визуализации)
CREATE TABLE IF NOT EXISTS pqueue_tasks (
    id VARCHAR(255) PRIMARY KEY,
    task TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    error TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_status ON pqueue_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pqueue_tasks_created_at ON pqueue_tasks(created_at DESC);
