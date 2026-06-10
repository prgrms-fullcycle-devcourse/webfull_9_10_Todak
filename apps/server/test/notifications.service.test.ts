/*
 * 알림 producer 핵심 헬퍼 createNotifications 테스트
 * - prisma/socket 을 모킹해 DB·소켓 없이 검증
 * - 핵심: 대상 유저마다 DB insert + 개인방(userId) emit, 중복 제거, 0명이면 no-op
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { createNotifications } from '@/services/notifications.service.js';
import { getIO } from '@/socket/index.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    notification: { create: vi.fn() },
  },
}));

vi.mock('@/socket/index.js', () => ({
  getIO: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = getIO as any;

describe('createNotifications', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toEmit: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toFn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db.notification.create.mockImplementation(async (args: { data: any }) => ({
      id: `noti-${args.data.userId}`,
      roomId: args.data.roomId,
      type: args.data.type,
      message: args.data.message,
      isRead: false,
      link: args.data.link ?? null,
      createdAt: new Date(0),
    }));
    toEmit = vi.fn();
    toFn = vi.fn(() => ({ emit: toEmit }));
    io.mockReturnValue({ to: toFn });
  });

  it('대상 유저마다 DB insert + 개인방 emit', async () => {
    await createNotifications(['u1', 'u2'], {
      roomId: 'r1',
      type: 'pr_merged',
      message: 'PR 머지됨',
      link: null,
    });

    expect(db.notification.create).toHaveBeenCalledTimes(2);
    expect(toFn).toHaveBeenCalledWith('u1');
    expect(toFn).toHaveBeenCalledWith('u2');
    expect(toEmit).toHaveBeenCalledTimes(2);
    expect(toEmit).toHaveBeenCalledWith(
      'notification:created',
      expect.objectContaining({
        room_id: 'r1',
        type: 'pr_merged',
        is_read: false,
        created_at: new Date(0).toISOString(),
      }),
    );
  });

  it('중복 userId 는 한 번만 처리', async () => {
    await createNotifications(['u1', 'u1'], {
      roomId: 'r1',
      type: 'new_issue',
      message: '새 이슈',
    });

    expect(db.notification.create).toHaveBeenCalledTimes(1);
    expect(toEmit).toHaveBeenCalledTimes(1);
  });

  it('수신자 0명이면 insert/emit 없이 no-op', async () => {
    await createNotifications([], {
      roomId: 'r1',
      type: 'new_issue',
      message: '새 이슈',
    });

    expect(db.notification.create).not.toHaveBeenCalled();
    expect(io).not.toHaveBeenCalled();
  });

  it('일부 유저 실패해도 throw 하지 않고 나머지는 발송(best-effort)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.notification.create.mockImplementation(async (args: { data: any }) => {
      if (args.data.userId === 'u1') {
        throw new Error('DB down');
      }
      return {
        id: 'noti-u2',
        roomId: args.data.roomId,
        type: args.data.type,
        message: args.data.message,
        isRead: false,
        link: null,
        createdAt: new Date(0),
      };
    });

    // throw 하지 않아야 함 (rejects 검증)
    await expect(
      createNotifications(['u1', 'u2'], {
        roomId: 'r1',
        type: 'pr_merged',
        message: 'm',
      }),
    ).resolves.toBeUndefined();

    // 실패는 로깅, 성공한 u2 는 emit
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(toEmit).toHaveBeenCalledTimes(1);
    expect(toFn).toHaveBeenCalledWith('u2');

    errorSpy.mockRestore();
  });
});
