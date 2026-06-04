import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

import { redis } from '../lib/redis.js';

export const strictLimiter = rateLimit({
  store: new RedisStore({
    // 이미 사용중인 redis 인스턴스 재사용
    sendCommand: (...args: string[]): Promise<RedisReply> =>
      redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
    prefix: 'ratelimit:strict:',
  }),
  windowMs: 60 * 1000, // 1분
  max: 5, // 윈도우당 최대 5회
  standardHeaders: true, // RateLimit-* 헤더 응답에 포함
  legacyHeaders: false, // 구형 X-RateLimit-* 헤더 비활성화
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      code: 'TOO_MANY_REQUESTS',
    });
  },
});
