/*
 * 통합테스트 setupFiles (테스트 파일마다 워커에서 실행).
 *
 * - env-inject 를 가장 먼저 import 해서 테스트용 env 를 주입한 뒤 prisma 를 로드한다.
 * - 각 테스트 전에 모든 public 테이블을 TRUNCATE 해서 테스트 간 데이터를 격리한다.
 */
import './env-inject.js'; // ★ 반드시 prisma 보다 먼저

import { afterAll, beforeEach, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';

/*
 * 외부 I/O 모킹 (앱+DB 통합이 목표이므로 3rd-party 는 가짜로 대체).
 * vi.mock 은 파일 최상단으로 hoisting 되어 어떤 테스트 파일이 app 을 import 하든 먼저 적용된다.
 *
 * - Redis/BullMQ: 큐 등록(addJob)·rate limit 을 위해 실제 Redis 가 필요한데, 테스트에선 띄우지 않는다.
 * - github.service: 룸 생성 시 GitHub webhook 등록 호출을 가짜로(네트워크 차단).
 * - socket: getIO() 는 초기화 전엔 throw 하므로, 어떤 메서드 체인도 받아주는 가짜로 대체.
 */
vi.mock('@/lib/redis.js', () => ({
  redis: new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/jobs/queues/index.js', () => ({
  addJob: vi.fn().mockResolvedValue(undefined),
  queues: new Proxy({}, { get: () => ({ add: vi.fn() }) }),
}));

vi.mock('@/middleware/rateLimit.middleware.js', () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    strictLimiter: pass,
    aiGenerateLimiter: pass,
    aiRefineLimiter: pass,
  };
});

vi.mock('@/services/github/github.service.js', async importActual => {
  const actual =
    await importActual<typeof import('@/services/github/github.service.js')>();
  return {
    ...actual,
    registerWebhook: vi.fn().mockResolvedValue('webhook_test_id'),
    unregisterWebhook: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/socket/index.js', () => {
  // 어떤 프로퍼티 접근/호출에도 자기 자신을 반환하는 체이너블 가짜 (getIO().to(x).emit(y) 등)
  const chainable: unknown = new Proxy(function () {}, {
    get: () => chainable,
    apply: () => chainable,
  });
  return {
    getIO: () => chainable,
    initSocket: () => chainable,
    closeSocket: () => undefined,
  };
});

// public 스키마의 사용자 테이블 목록 (prisma 내부 테이블이 있다면 제외)
async function listTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma\\_%'
  `;
  return rows.map(r => r.tablename);
}

beforeEach(async () => {
  const tables = await listTables();
  if (tables.length === 0) {
    return;
  }
  const quoted = tables.map(t => `"public"."${t}"`).join(', ');
  // RESTART IDENTITY: 시퀀스 초기화, CASCADE: FK 로 묶인 테이블 함께 비움
  await prisma.$executeRawUnsafe(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
