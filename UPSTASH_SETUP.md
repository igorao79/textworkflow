# Настройка Upstash Redis + BullMQ

## ✅ СТАТУС: ГОТОВО К ПРОДАКШЕНУ

Код уже настроен для работы с Upstash Redis. Осталось только добавить переменные окружения.

## 1. Создать аккаунт на Upstash
Перейдите на https://console.upstash.com/ и создайте бесплатный аккаунт.

## 2. Создать Redis базу данных
1. Нажмите "Create Database"
2. Выберите "Redis"
3. Выберите бесплатный план (до 10k запросов в месяц)
4. Укажите название базы данных
5. Выберите регион (рекомендуется EU-West или US-East для Vercel)

## 3. Получить credentials
После создания базы данных вы получите:
- `UPSTASH_REDIS_REST_URL` - REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - REST API Token

## 4. Настроить переменные окружения на Vercel

### Vercel Dashboard:
1. Перейдите в проект
2. Settings → Environment Variables
3. Добавьте переменные:
   - `UPSTASH_REDIS_REST_URL=https://good-kiwi-22374.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN=AVdmAAIncDEzOTNmZTM0MjA3NWU0NjVhODA1MmE2Y2MyNjE2MzVkMXAxMjIzNzQ`

## 5. Локальная разработка
Для локальной разработки установите локальный Redis или используйте fallback на mock данные.

## 6. Мониторинг
В Upstash Dashboard вы можете:
- Видеть статистику использования
- Мониторить запросы
- Просматривать логи

## Преимущества Upstash Redis:
- ✅ Бесплатный план до 10k запросов
- ✅ REST API (работает в serverless)
- ✅ Автоматическое масштабирование
- ✅ Встроенная безопасность
- ✅ Современный BullMQ вместо старого Bull

## Что изменено в коде:
- ✅ Обновлен `src/lib/queue.ts` для BullMQ с Upstash
- ✅ Создан API `/api/queue/visualization` для BullMQ
- ✅ Обновлена визуализация очереди в dashboard
- ✅ Добавлено логирование для диагностики
