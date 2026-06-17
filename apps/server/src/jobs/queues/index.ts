import { Queue } from 'bullmq';

import { redis } from '../../lib/redis.js';
import { JobName } from '../../types/index.js';

const connection = redis;

/*
 * 외부 API/네트워크에 의존하는 잡들의 공통 재시도 정책.
 * 타임아웃·레이트리밋 같은 일시적 실패는 재시도하면 성공할 수 있으므로
 * exponential backoff로 3회까지 재시도한다. 영구적 실패는 워커에서
 * UnrecoverableError를 던져 재시도 없이 즉시 종료한다.
 *
 * 완료/실패 잡은 Redis에 영구 누적(bloat)되므로 보관 정책으로 자동 정리한다.
 * - 완료: 1일 또는 최대 1000개까지만 유지(디버깅 여유 + 누적 방지)
 * - 실패: 원인 추적 위해 더 길게 7일 또는 최대 1000개
 */
const retryJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 1000 },
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
