/*
 * graceful shutdown 유닛 테스트
 *
 * 기본 개념은 private-room.service.test.ts 상단 주석과 동일합니다.
 *   - 외부 의존성(Redis, BullMQ, socket.io 등)을 가짜로 대체(mock)해서
 *     실제 연결 없이 "정리 로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   closeWorkers : 등록된 BullMQ 워커들을 모두 close() (처리 중 잡 마무리 후 종료)
 *   closeSocket  : 열린 소켓 클라이언트 연결을 모두 끊기
 *
 * 왜 이렇게 mock 하나:
 *   - workers/index.ts 와 socket/index.ts 는 import 되는 순간
 *     Redis 에 연결하거나 Anthropic 클라이언트를 만든다.
 *   - 테스트에선 실제 연결이 필요 없으므로 import 시점의 부작용을 가짜로 막는다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * vi.mock 의 팩토리는 파일 최상단으로 끌어올려진다(hoisting).
 * 그래서 mock 안에서 쓸 공유 상태는 vi.hoisted 로 만들어야 안전하다.
 *   - workerInstances: new Worker() 로 만들어진 가짜 워커들을 모아둔다
 *   - socket.disconnectSockets: 가짜 socket.io 서버의 disconnectSockets 스파이
 */
const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workerInstances: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: { disconnectSockets: undefined as any },
}));

// BullMQ: 실제 Redis 연결 없이 Worker/Queue 를 가짜로 대체
vi.mock('bullmq', () => {
  class Worker {
    close = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
    constructor() {
      // 생성되는 모든 워커를 모아두면, close 호출 여부를 한 번에 검증할 수 있다
      h.workerInstances.push(this);
    }
  }
  class Queue {
    add = vi.fn().mockResolvedValue(undefined);
  }
  // 코드에서 instanceof/throw 로 쓰이므로 Error 를 상속한 더미로 둔다
  class UnrecoverableError extends Error {}

  return { Worker, Queue, UnrecoverableError };
});

// import 시점에 실제 Redis 커넥션이 생기지 않도록 빈 객체로 대체
vi.mock('@/lib/redis.js', () => ({ redis: {} }));

// import 시점에 Anthropic 클라이언트(API 키 필요)가 만들어지지 않도록 대체
vi.mock('@/services/anthropic.service.js', () => ({
  reviewCode: vi.fn(),
  generateMinutesSummary: vi.fn(),
}));

// socket.io Server 를 가짜로 대체 — 네트워크 없이 메서드 호출만 관찰
vi.mock('socket.io', () => {
  class Server {
    use = vi.fn();
    on = vi.fn();
    disconnectSockets = vi.fn();
    constructor() {
      // 가장 최근에 만들어진 서버의 스파이를 공유 상태에 노출
      h.socket.disconnectSockets = this.disconnectSockets;
    }
  }

  return { Server };
});

// 위 mock 들이 적용된 뒤에 대상 모듈을 가져온다
import { closeWorkers } from '@/jobs/workers/index.js';
import { closeSocket, initSocket } from '@/socket/index.js';

beforeEach(() => {
  // 가짜 함수들의 호출기록 초기화 (구현/주입값은 유지됨)
  vi.clearAllMocks();
});

describe('closeWorkers', () => {
  it('등록된 모든 워커의 close() 를 정확히 한 번씩 호출한다', async () => {
    // Arrange: 모듈 로드 시 ai-review / minutes-generation / chat-cleanup
    //          3개의 Worker 가 생성되어 workerInstances 에 쌓여 있다
    expect(h.workerInstances.length).toBe(3);

    // Act
    await closeWorkers();

    // Assert: 각 워커가 정확히 한 번씩 닫혔는가
    //         (close 는 처리 중인 잡이 끝날 때까지 기다린 뒤 종료한다)
    for (const worker of h.workerInstances) {
      expect(worker.close).toHaveBeenCalledTimes(1);
    }
  });

  it('워커 close 중 하나라도 실패하면 reject 된다 (Promise.all 로 모두 기다림)', async () => {
    // Arrange: 한 워커의 close 가 실패하도록 주입
    h.workerInstances[0].close.mockRejectedValueOnce(new Error('close 실패'));

    // Act & Assert: 실패가 그대로 전파되어야 셧다운이 오류로 처리된다
    await expect(closeWorkers()).rejects.toThrow('close 실패');

    // 나머지 워커들에게도 close 가 시도됐는가 (일부만 닫고 빠지면 안 됨)
    for (const worker of h.workerInstances) {
      expect(worker.close).toHaveBeenCalled();
    }
  });
});

describe('closeSocket', () => {
  it('initSocket 호출 전에는 아무것도 하지 않고 에러도 던지지 않는다', () => {
    // Arrange: 아직 io 가 초기화되지 않은 상태 (서버가 미처 못 뜬 시점의 셧다운 대비)
    // Act & Assert: 안전하게 무시되어야 한다
    expect(() => closeSocket()).not.toThrow();
  });

  it('initSocket 후에는 io.disconnectSockets(true) 로 모든 소켓 연결을 끊는다', () => {
    // Arrange: 가짜 httpServer 로 소켓 초기화
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeHttpServer = {} as any;
    initSocket(fakeHttpServer);

    // Act
    closeSocket();

    // Assert: close:true 로 하부 연결까지 강제 종료해야 httpServer 가 드레인될 수 있다
    expect(h.socket.disconnectSockets).toHaveBeenCalledWith(true);
  });
});
