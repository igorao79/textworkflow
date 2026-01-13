# FlowForge - Workflow Builder

Современный визуальный конструктор автоматизированных процессов (workflow) с drag-and-drop интерфейсом. Полностью serverless решение для автоматизации бизнес-процессов.

## 🚀 Возможности

- **Визуальный редактор workflow** с drag-and-drop интерфейсом
- **Четыре типа триггеров**: Webhook, Cron расписание (QStash), Email, Manual
- **Пять типов действий**:
  - HTTP запросы
  - Отправка Email (через Resend)
  - Отправка Telegram сообщений
  - Операции с базой данных (PostgreSQL)
  - Трансформация данных
- **Serverless очередь задач** с Upstash Redis
- **Cron задачи** через QStash (production) и node-cron (development)
- **PostgreSQL база данных** (Neon)
- **Логирование** выполнения шагов
- **Обработка ошибок** с retry и уведомлениями
- **REST API** с интерактивной Swagger документацией
- **Адаптивный дизайн** с темной палитрой
- **Полная serverless архитектура** (Vercel + Upstash + QStash + Neon)

## 📋 Предварительные требования

- Node.js 18+
- npm или yarn
- Аккаунты в сервисах:
  - [Neon](https://neon.tech) (PostgreSQL database)
  - [Upstash](https://upstash.com) (Redis)
  - [QStash](https://upstash.com/qstash) (Cron jobs)
  - [Resend](https://resend.com) (Email, опционально)
  - [Vercel](https://vercel.com) (Deployment)

## 🚀 Быстрый старт

1. **Клонируйте репозиторий**
   ```bash
   git clone <repository-url>
   cd workflow
   ```

2. **Установите зависимости**
   ```bash
   npm install
   ```

3. **Создайте файл переменных окружения**
   ```bash
   # Создайте файл .env.local и добавьте следующие переменные:
   touch .env.local
   ```

   Скопируйте в `.env.local`:
   ```env
   # Database (Neon PostgreSQL)
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # Redis (Upstash)
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token

   # QStash (Cron Jobs)
   QSTASH_TOKEN=your-qstash-token
   QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
   QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Optional: Email (Resend)
   RESEND_API_KEY=your-resend-api-key

   # Optional: Telegram
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   TELEGRAM_ERROR_CHAT_ID=your-chat-id

   # Optional: Error notifications
   ERROR_NOTIFICATION_EMAIL=your-email@example.com
   ```

   **Как получить API ключи:**
   - **Neon**: Зарегистрируйтесь на [neon.tech](https://neon.tech), создайте проект
   - **Upstash**: Зарегистрируйтесь на [upstash.com](https://upstash.com), создайте Redis базу
   - **QStash**: Используйте тот же аккаунт Upstash, перейдите в раздел QStash
   - **Resend**: Зарегистрируйтесь на [resend.com](https://resend.com)
   - **Telegram**: Создайте бота через [@BotFather](https://t.me/botfather) в Telegram

4. **Настройте базу данных**
   ```bash
   # Создайте таблицы в PostgreSQL
   npm run db:setup

   # Или вручную выполните SQL скрипты:
   # create-tables.sql, executions-schema.sql
   ```

3. **Настройте переменные окружения**
   ```bash
   cp .env.example .env.local
   ```

   Обязательные переменные:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host/database

   # Redis (Upstash)
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token

   # QStash (для cron задач)
   QSTASH_TOKEN=your-qstash-token
   QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
   QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

   # App URL (для production)
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

   Опциональные переменные:
   ```env
   # Email (Resend)
   RESEND_API_KEY=your-resend-api-key

   # Telegram
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   TELEGRAM_ERROR_CHAT_ID=your-chat-id

   # Error notifications
   ERROR_NOTIFICATION_EMAIL=your-email@example.com
   ```

4. **Настройте базу данных**
   ```bash
   # Создайте таблицы в Neon
   npm run db:setup
   ```

5. **Запустите приложение**
   ```bash
   npm run dev
   ```

6. **Откройте браузер**
   ```
   http://localhost:3000
   ```

## 📖 Использование

### Создание Workflow

1. Перейдите на главную страницу
2. Заполните форму с данными пользователя
3. В разделе "Редактор Workflow":
   - Выберите тип триггера (Webhook/Cron/Email)
   - Перетащите действия из палитры в рабочую область
   - Настройте параметры каждого действия
4. Нажмите "Запустить Workflow"

### API Документация

Документация API доступна по адресу:
```
http://localhost:3000/api-docs
```

### API Endpoints

#### Основные операции
- `GET/POST /api/workflows` - Управление workflows
- `GET/POST /api/executions` - Запуск и мониторинг выполнений
- `POST /api/webhooks/{workflowId}` - Webhook триггеры

#### Cron задачи (QStash)
- `POST /api/cron/activate/{workflowId}` - Активация cron расписания
- `POST /api/cron/deactivate/{workflowId}` - Деактивация cron
- `POST /api/qstash/webhook` - Обработчик QStash webhook

#### Очередь задач
- `GET /api/queue/stats` - Статистика очереди
- `POST /api/queue/process` - Обработка следующей задачи
- `POST /api/queue/pause` - Управление паузой очереди

#### Система уведомлений
- Email через Resend (опционально)
- Telegram боты (опционально)
- Автоматические уведомления об ошибках

### Особенности QStash интеграции

**Production режим:**
- Используется QStash для надежных cron задач
- Webhook endpoint: `/api/qstash/webhook`
- Поддержка retry и timeout

**Development режим:**
- Используется node-cron как fallback
- Не требует внешних сервисов
- Работает локально

**Переключение режимов:**
- Production: `NEXT_PUBLIC_APP_URL` установлен и не localhost
- Development: `NODE_ENV=development` или localhost URL

## 🏗️ Архитектура

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── cron/          # Управление cron задачами
│   │   ├── qstash/        # QStash интеграция
│   │   ├── queue/         # Управление очередью
│   │   └── workflows/     # CRUD операции с workflows
│   ├── api-docs/          # Swagger документация
│   ├── dashboard/         # Главная панель
│   └── globals.css        # Темные стили
├── components/            # React компоненты
│   ├── ui/               # Shadcn/ui компоненты
│   └── workflow/         # Компоненты редактора workflow
├── lib/                  # Утилиты и сервисы
│   ├── db.ts            # PostgreSQL подключение (Neon)
│   ├── queue-service.ts # Upstash Redis очередь
│   └── utils.ts         # Вспомогательные функции
├── services/             # Бизнес-логика
│   ├── workflowService.ts   # Основная логика workflow
│   ├── qstashService.ts     # QStash интеграция
│   ├── cronService.ts       # Cron задачи
│   └── notificationService.ts # Уведомления
├── types/               # TypeScript типы
├── workers/             # Worker threads для тяжелых задач
└── middleware.ts        # CORS и другие middleware

scripts/                  # Скрипты настройки
├── create-executions-table.ts
├── migrate-executions-to-db.ts
└── setup-workflows.js
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Обязательно |
|------------|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL (Neon) | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis токен | ✅ |
| `QSTASH_TOKEN` | QStash API токен | ✅ |
| `QSTASH_CURRENT_SIGNING_KEY` | Текущий ключ подписи QStash | ✅ |
| `QSTASH_NEXT_SIGNING_KEY` | Следующий ключ подписи QStash | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL приложения (production) | ✅ |
| `RESEND_API_KEY` | Resend API ключ для email | ❌ |
| `TELEGRAM_BOT_TOKEN` | Telegram бот токен | ❌ |
| `TELEGRAM_ERROR_CHAT_ID` | ID чата для уведомлений | ❌ |
| `ERROR_NOTIFICATION_EMAIL` | Email для уведомлений об ошибках | ❌ |

### Настройка сервисов

#### 1. Neon (PostgreSQL)
```bash
# Создайте проект в Neon
# Получите DATABASE_URL из dashboard
```

#### 2. Upstash Redis
```bash
# Создайте Redis базу в Upstash
# Получите UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN
```

#### 3. QStash (Cron Jobs)
```bash
# Создайте проект в QStash (через Upstash dashboard)
# Получите токены из раздела QStash
```

#### 4. Vercel (Deployment)
```bash
# Создайте проект на Vercel
# Добавьте все переменные окружения
# Разверните приложение
```

## 📊 Мониторинг

### Логи выполнения

Логи выполнения workflow доступны через API:
```
GET /api/executions?workflowId={id}
GET /api/executions/{executionId}
```

### Статус очереди

Мониторинг Upstash Redis очереди:
```
GET /api/queue/stats          # Статистика очереди
GET /api/queue/state          # Детальное состояние
POST /api/queue/process       # Ручная обработка задач
```

### QStash Dashboard

Для мониторинга cron задач используйте:
- [QStash Dashboard](https://console.upstash.com/qstash)
- Проверка webhook логов
- Мониторинг доставки сообщений

### Database Monitoring

PostgreSQL метрики доступны в:
- [Neon Dashboard](https://console.neon.tech)
- Connection pooling stats
- Query performance monitoring

## 🚀 Деплой

### Vercel (Рекомендуемый)

1. **Подключите репозиторий к Vercel**
   ```bash
   # Создайте проект на Vercel
   # Подключите GitHub репозиторий
   ```

2. **Настройте переменные окружения в Vercel**
   - Добавьте все обязательные переменные из раздела конфигурации
   - Установите `NODE_ENV=production`
   - Установите `NEXT_PUBLIC_APP_URL` на ваш Vercel URL

3. **Database Migrations**
   ```bash
   # Выполните миграции перед деплоем
   npm run db:setup
   ```

4. **Деплой**
   - Vercel автоматически развернет приложение
   - QStash будет работать в production режиме
   - Upstash Redis будет использоваться для очередей

### Локальная разработка

Для локальной разработки с Vercel-like окружением:

```bash
# Установите Vercel CLI
npm i -g vercel

# Локальный development
vercel dev
```

### Production URLs

После деплоя обновите `NEXT_PUBLIC_APP_URL` в переменных окружения Vercel на актуальный URL вашего приложения.

## 🔧 Troubleshooting

### Проблемы с очередью

**"Ожидают 1" не обрабатывается:**
```bash
# Проверьте статус очереди
curl https://your-app.vercel.app/api/queue/stats

# Обработайте задачу вручную
curl -X POST https://your-app.vercel.app/api/queue/process
```

**QStash не работает:**
- Проверьте `QSTASH_TOKEN` и signing keys
- Убедитесь что `NEXT_PUBLIC_APP_URL` корректный
- Проверьте логи в QStash dashboard

### Database Issues

**Connection errors:**
- Проверьте `DATABASE_URL` в Vercel
- Убедитесь что Neon database доступна
- Проверьте connection limits

### CORS Issues

**API недоступен:**
- Проверьте `NEXT_PUBLIC_APP_URL` в API документации
- Убедитесь что CORS настроен правильно
- Используйте HTTPS в production

