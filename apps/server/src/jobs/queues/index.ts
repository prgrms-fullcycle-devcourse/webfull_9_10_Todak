import { Queue } from 'bullmq';

import { redis } from '../../lib/redis.js';
import { JobName } from '../../types/index.js';

const connection = redis;

export const queues: Record<JobName, Queue> = {
  'ai-review': new Queue('ai-review', { connection }),
  'github-sync': new Queue('github-sync', { connection }),
  notification: new Queue('notification', { connection }),
  'minutes-generation': new Queue('minutes-generation', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  }),
  'chat-cleanup': new Queue('chat-cleanup', { connection }),
};

export async function addJob<T>(name: JobName, data: T, opts?: object) {
  return queues[name].add(name, data, opts);
}
