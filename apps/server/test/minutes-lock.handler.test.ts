/*
 * 회의록 편집 잠금(minutes lock) 소켓 핸들러 유닛 테스트
 * - redis(SET NX/eval)·prisma(룸/멤버)를 모킹해 lock 분기만 검증
 * - 획득 / 타인 점유 거절 / 비멤버 무시 / 해제
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { registerMinutesLockHandlers } from '@/socket/handlers/minutes.handler.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    minutes: { findUnique: vi.fn() },
    roomMember: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/redis.js', () => ({
  redis: { set: vi.fn(), get: vi.fn(), expire: vi.fn(), eval: vi.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = redis as any;

const MINUTES_ID = '11111111-1111-4111-8111-111111111111';
const ROOM_ID = 'room-1';

// 핸들러를 등록하고, 이벤트별 콜백 + io/socket emit 스파이를 돌려준다
function setup() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers: Record<string, (raw: any) => Promise<void> | void> = {};
  const roomEmit = vi.fn();
  const io = { to: vi.fn(() => ({ emit: roomEmit })) };
  const socketEmit = vi.fn();
  const socket = {
    data: { user: { id: 'u1', login: 'alice' } },
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = cb;
    }),
    emit: socketEmit,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerMinutesLockHandlers(io as any, socket as any);

  return { handlers, io, roomEmit, socketEmit };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 기본: 회의록 존재 + 호출자는 룸 멤버
  db.minutes.findUnique.mockResolvedValue({ roomId: ROOM_ID });
  db.roomMember.findFirst.mockResolvedValue({ id: 'm1' });
});

describe('minutes:request-lock', () => {
  it('획득 성공 시 룸 전체에 lock-acquired 브로드캐스트', async () => {
    r.set.mockResolvedValue('OK'); // NX 성공

    const { handlers, io, roomEmit, socketEmit } = setup();
    await handlers['minutes:request-lock']({ minutes_id: MINUTES_ID });

    expect(r.set).toHaveBeenCalledWith(
      `minutes:lock:${MINUTES_ID}`,
      'u1',
      'EX',
      300,
      'NX',
    );
    expect(io.to).toHaveBeenCalledWith(ROOM_ID);
    expect(roomEmit).toHaveBeenCalledWith('minutes:lock-acquired', {
      minutes_id: MINUTES_ID,
      user_id: 'u1',
      login: 'alice',
    });
    expect(socketEmit).not.toHaveBeenCalled();
  });

  it('타인이 점유 중이면 요청자에게만 lock-denied', async () => {
    r.set.mockResolvedValue(null); // 이미 잠김
    r.get.mockResolvedValue('u2'); // 보유자는 타인

    const { handlers, roomEmit, socketEmit } = setup();
    await handlers['minutes:request-lock']({ minutes_id: MINUTES_ID });

    expect(socketEmit).toHaveBeenCalledWith('minutes:lock-denied', {
      minutes_id: MINUTES_ID,
      reason: 'already_locked',
    });
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('본인이 이미 보유 중이면 재획득(TTL 갱신) + lock-acquired', async () => {
    r.set.mockResolvedValue(null);
    r.get.mockResolvedValue('u1'); // 보유자가 본인

    const { handlers, roomEmit } = setup();
    await handlers['minutes:request-lock']({ minutes_id: MINUTES_ID });

    expect(r.expire).toHaveBeenCalledWith(`minutes:lock:${MINUTES_ID}`, 300);
    expect(roomEmit).toHaveBeenCalledWith(
      'minutes:lock-acquired',
      expect.objectContaining({ user_id: 'u1' }),
    );
  });

  it('룸 멤버가 아니면 조용히 무시 (lock 시도 안 함)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    const { handlers, roomEmit, socketEmit } = setup();
    await handlers['minutes:request-lock']({ minutes_id: MINUTES_ID });

    expect(r.set).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
    expect(socketEmit).not.toHaveBeenCalled();
  });
});

describe('minutes:release-lock', () => {
  it('보유자 본인 해제 시 룸 전체에 lock-released', async () => {
    r.eval.mockResolvedValue(1); // compare-and-del 성공(내 lock)

    const { handlers, io, roomEmit } = setup();
    await handlers['minutes:release-lock']({ minutes_id: MINUTES_ID });

    expect(io.to).toHaveBeenCalledWith(ROOM_ID);
    expect(roomEmit).toHaveBeenCalledWith('minutes:lock-released', {
      minutes_id: MINUTES_ID,
      user_id: 'u1',
    });
  });

  it('내 lock 이 아니면(이미 만료/타인) 브로드캐스트 안 함', async () => {
    r.eval.mockResolvedValue(0);

    const { handlers, roomEmit } = setup();
    await handlers['minutes:release-lock']({ minutes_id: MINUTES_ID });

    expect(roomEmit).not.toHaveBeenCalled();
  });
});
