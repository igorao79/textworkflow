import { NextApiRequest, NextApiResponse } from 'next';
import { Worker } from 'worker_threads';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Processing queue...');

    // Получаем следующую задачу из очереди
    const { getQueueService } = await import('@/lib/queue-service');
    const queueService = getQueueService();
    const job = await queueService.getNextJob();

    if (!job) {
      console.log('📭 No jobs in queue');
      return res.status(200).json({ message: 'No jobs to process' });
    }

    console.log(`🚀 Processing job: ${job.id} for workflow: ${job.workflowId}`);

    // Запускаем воркер для выполнения задачи
    const workerPath = path.join(process.cwd(), 'src/workers/workflow-worker.ts');

    const worker = new Worker(workerPath, {
      workerData: {
        workflowId: job.workflowId,
        triggerData: job.triggerData
      }
    });

    // Ожидаем завершения воркера
    const result = await new Promise((resolve, reject) => {
      worker.on('message', (message) => {
        console.log('📨 Worker message:', message);
        resolve(message);
      });

      worker.on('error', (error) => {
        console.error('❌ Worker error:', error);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ Worker exited with code ${code}`);
          reject(new Error(`Worker exited with code ${code}`));
        }
      });

      // Таймаут 5 минут
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });

    // Обновляем статус задачи
    if ((result as any).success) {
      await queueService.completeJob(job.id, (result as any).result);
      console.log(`✅ Job ${job.id} completed successfully`);
    } else {
      await queueService.failJob(job.id, (result as any).error);
      console.log(`❌ Job ${job.id} failed: ${(result as any).error}`);
    }

    res.status(200).json({
      message: 'Job processed',
      jobId: job.id,
      result
    });

  } catch (error) {
    console.error('❌ Error processing queue:', error);
    res.status(500).json({
      error: 'Failed to process queue',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
