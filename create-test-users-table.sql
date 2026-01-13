-- Создание или обновление таблицы test_users с нужными колонками
-- Выполните этот SQL в вашей базе данных

-- Сначала проверим, существует ли таблица
DO $$
BEGIN
    -- Если таблица существует, добавим недостающие колонки
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_users') THEN
        -- Добавляем колонку name, если её нет
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_users' AND column_name = 'name') THEN
            ALTER TABLE test_users ADD COLUMN name VARCHAR(255);
        END IF;

        -- Добавляем колонку email, если её нет
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_users' AND column_name = 'email') THEN
            ALTER TABLE test_users ADD COLUMN email VARCHAR(255);
        END IF;

        -- Добавляем колонку age, если её нет
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_users' AND column_name = 'age') THEN
            ALTER TABLE test_users ADD COLUMN age INTEGER;
        END IF;

        -- Добавляем колонку status, если её нет
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_users' AND column_name = 'status') THEN
            ALTER TABLE test_users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        END IF;

        -- Добавляем колонку created_at, если её нет
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_users' AND column_name = 'created_at') THEN
            ALTER TABLE test_users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        RAISE NOTICE 'Таблица test_users обновлена с новыми колонками';
    ELSE
        -- Создаём таблицу с нуля
        CREATE TABLE test_users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            age INTEGER,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Таблица test_users создана';
    END IF;
END $$;
