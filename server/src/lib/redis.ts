import IORedis from 'ioredis';

import { env } from '../config/env';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required for BullMQ
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', err => console.error('❌ Redis error:', err));
