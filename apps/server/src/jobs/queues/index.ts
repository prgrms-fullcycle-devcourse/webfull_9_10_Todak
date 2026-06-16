import { Queue } from 'bullmq';

import { redis } from '../../lib/redis.js';
import { JobName } from '../../types/index.js';

const connection = redis;

/*
 * 외부 API/네트워크에 의존하는 잡들의 공통 재시도 정책.
 * 타임아웃·레이트리밋 같은 일시적 실패는 재시도하면 성공할 수 있으므로
 * exponential backoff로 3회까지 재시도한다. 영구적 실패는 워커에서
 * UnrecoverableError를 던져 재시도 없이 즉시 종료한다.
 */
const retryJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

export const queues: Record<JobName, Queue> = {
  'ai-review': new Queue('ai-review', {
    connection,
    defaultJobOptions: retryJobOptions,
  }),
  'github-sync': new Queue('github-sync', {
    connection,
    defaultJobOptions: retryJobOptions,
  }),
  notification: new Queue('notification', {
    connection,
    defaultJobOptions: retryJobOptions,
  }),
  'minutes-generation': new Queue('minutes-generation', {
    connection,
    defaultJobOptions: retryJobOptions,
  }),
  'chat-cleanup': new Queue('chat-cleanup', { connection }),
  'minutes-sweep': new Queue('minutes-sweep', { connection }),
};

export async function addJob<T>(name: JobName, data: T, opts?: object) {
  return queues[name].add(name, data, opts);
}
