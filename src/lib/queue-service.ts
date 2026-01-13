// Простая Redis-очередь без BullMQ для serverless
// Использует Upstash Redis напрямую

import { Redis } from '@upstash/redis';

interface QueueJob {
  id: string;
  workflowId: string;
  triggerData: Record<string, unknown>;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export class QueueService {
  private redis: Redis;

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis environment variables not configured');
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  // Добавление задачи в очередь ожидания
  async addJob(workflowId: string, triggerData: Record<string, unknown> = {}) {
    const jobId = `job_${workflowId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const jobData = {
      id: jobId,
      workflowId,
      triggerData,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };

    // Добавляем в очередь ожидания
    await this.redis.lpush('queue:waiting', JSON.stringify(jobData));

    return { jobId, jobData };
  }

  // Получение статистики очередей
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.redis.llen('queue:waiting'),
      this.redis.llen('queue:active'),
      this.redis.llen('queue:completed'),
      this.redis.llen('queue:failed')
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  }

  // Получение следующей задачи из очереди ожидания
  async getNextJob(): Promise<QueueJob | null> {
    const jobData = await this.redis.rpop('queue:waiting');
    if (jobData) {
      await this.redis.lpush('queue:active', jobData);
    }

    if (!jobData) return null;

    try {
      return JSON.parse(jobData);
    } catch (error) {
      console.error('Failed to parse job data:', error);
      return null;
    }
  }

  // Перемещение задачи в завершенные
  async completeJob(jobId: string, result?: Record<string, unknown>) {
    // Находим и удаляем задачу из активных
    const activeJobs = await this.redis.lrange('queue:active', 0, -1);

    for (const jobData of activeJobs) {
      try {
        const job = JSON.parse(jobData);
        if (job.id === jobId) {
          // Удаляем из активных
          await this.redis.lrem('queue:active', 0, jobData);

          // Добавляем в завершенные
          const completedJob = {
            ...job,
            status: 'completed',
            result,
            completedAt: new Date().toISOString()
          };

          await this.redis.lpush('queue:completed', JSON.stringify(completedJob));
          return completedJob;
        }
      } catch (error) {
        console.error('Error processing active job:', error);
      }
    }

    return null;
  }

  // Получение всех активных задач
  async getActiveJobs(): Promise<string[]> {
    return await this.redis.lrange('queue:active', 0, -1);
  }

  // Перемещение задачи в неудачные
  async failJob(jobId: string, error?: string) {
    // Находим и удаляем задачу из активных
    const activeJobs = await this.redis.lrange('queue:active', 0, -1);

    for (const jobData of activeJobs) {
      try {
        const job = JSON.parse(jobData);
        if (job.id === jobId) {
          // Удаляем из активных
          await this.redis.lrem('queue:active', 0, jobData);

          // Добавляем в неудачные
          const failedJob = {
            ...job,
            status: 'failed',
            error,
            failedAt: new Date().toISOString()
          };

          await this.redis.lpush('queue:failed', JSON.stringify(failedJob));
          return failedJob;
        }
      } catch (error) {
        console.error('Error processing active job:', error);
      }
    }

    return null;
  }
}

// Singleton instance
let queueService: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueService) {
    queueService = new QueueService();
  }
  return queueService;
}
