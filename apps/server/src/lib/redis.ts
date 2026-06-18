import { Redis } from 'ioredis';

import { env } from '../config/env.js';

import { logger } from './logger.js';

const redisUrl = env.REDIS_URL;
const isTls = redisUrl?.startsWith('rediss://');
const tlsOptions = isTls
  ? { servername: new URL(redisUrl).hostname }
  : undefined;

export const redis = new Redis(redisUrl, {
  // BullMQ 사용할 때 권장
  maxRetriesPerRequest: null,
  // TLS가 필요한 Redis 환경에서는 SNI 서버 이름을 명시
  tls: tlsOptions,
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err: Error) => {
  logger.error({ err }, '❌ Redis error');
});
