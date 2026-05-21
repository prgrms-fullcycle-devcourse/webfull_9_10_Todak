import { Worker } from 'bullmq';

import { redis } from '../../lib/redis.js';
import { reviewCode } from '../../services/anthropic.service.js';

const connection = redis;

export const aiReviewWorker = new Worker(
  'ai-review',
  async job => {
    const { code, context } = job.data as { code: string; context?: string };
    console.log(`[Worker] ai-review job ${job.id} started`);
    const result = await reviewCode(code, context);

    return { result };
  },
  { connection },
);

aiReviewWorker.on('completed', job => {
  console.log(`[Worker] ai-review job ${job.id} completed`);
});

aiReviewWorker.on('failed', (job, err) => {
  console.error(`[Worker] ai-review job ${job?.id} failed:`, err.message);
});

export function startWorkers() {
  console.log('✅ BullMQ workers started');
}
