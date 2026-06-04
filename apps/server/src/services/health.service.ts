import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

/*
 * Health check 서비스
 * 단순히 "프로세스가 살아있다"가 아니라, 실제로 의존하는 DB/Redis 에
 * 핑을 보내 연결이 정상인지 확인한다. Railway/로드밸런서의 헬스 프로브가
 * 죽은 인스턴스(예: DB 끊김)를 트래픽에서 빼낼 수 있게 한다.
 */

export type DependencyStatus = 'up' | 'down';

export interface HealthCheckResult {
  healthy: boolean;
  db: DependencyStatus;
  redis: DependencyStatus;
}

/*
 * 의존성 점검 제한 시간(ms). Redis 는 maxRetriesPerRequest:null 이라
 * 연결이 끊기면 명령이 무한정 큐잉될 수 있어 타임아웃으로 막아준다.
 */
const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), ms),
    ),
  ]);
}

async function checkDb(): Promise<DependencyStatus> {
  try {
    // 가장 가벼운 쿼리로 커넥션이 살아있는지만 확인
    await withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS);

    return 'up';
  } catch {
    return 'down';
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  try {
    const pong = await withTimeout(redis.ping(), CHECK_TIMEOUT_MS);

    return pong === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export async function checkHealth(): Promise<HealthCheckResult> {
  // 두 점검을 병렬로 — 하나가 느려도 전체 응답이 느려지지 않도록
  const [db, redisStatus] = await Promise.all([checkDb(), checkRedis()]);

  return {
    healthy: db === 'up' && redisStatus === 'up',
    db,
    redis: redisStatus,
  };
}
