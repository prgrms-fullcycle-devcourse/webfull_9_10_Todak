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

/*
 * socket 이벤트용 rate limit.
 *
 * INCR 과 "첫 호출 시 만료(PEXPIRE)"를 Lua 로 원자 실행한다.
 * JS 에서 incr 후 따로 expire 하면, 그 사이 프로세스가 죽을 때 키에 TTL 이
 * 안 붙어 영구 잔존(=해당 키가 영영 풀리지 않음)하는 경쟁 상태가 생기는데,
 * 한 스크립트로 묶어 이를 방지한다.
 */
const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export interface RateLimitResult {
  allowed: boolean; // limit 이내면 true, 초과면 false
  current: number; // 현재 윈도우 내 누적 호출 횟수
}

/*
 * key 에 대해 1회 소비하고 limit 초과 여부를 돌려준다.
 * windowMs 동안 limit 회까지 허용. (limit+1 번째부터 allowed=false)
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const current = (await redis.eval(
    CONSUME_SCRIPT,
    1,
    key,
    windowMs,
  )) as number;

  return { allowed: current <= limit, current };
}
