import { Queue } from 'bullmq';

import { redis } from '../../lib/redis';
import { JobName } from '../../types';

const connection = redis;

export const queues: Record<JobName, Queue> = {
  'ai-review': new Queue('ai-review', { connection }),
  'github-sync': new Queue('github-sync', { connection }),
  notification: new Queue('notification', { connection }),
};

export async function addJob<T>(name: JobName, data: T, opts?: object) {
  return queues[name].add(name, data, opts);
}
