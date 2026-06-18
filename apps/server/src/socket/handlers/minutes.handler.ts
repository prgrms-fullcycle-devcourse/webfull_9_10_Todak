import { z } from 'zod';

import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { toSocketError } from '../socket-error.js';
import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 회의록 편집 잠금(advisory) 소켓 핸들러
 *
 * 동시 편집 방지를 위해 minutes 별 lock 을 Redis 에 원자적으로 잡고(SET NX EX),
 * 룸 멤버에게 현황을 브로드캐스트한다.
 *   - 서버는 PATCH 를 강제하지 않는다(협조적) — 입력칸 잠금은 프론트가 처리
 *   - 자동 해제: 명시적 release / 연결 끊김(disconnect) / TTL 만료
 * ────────────────────────────────────────────────────────────
 */

// 편집 잠금 TTL(초) — disconnect 누락·프리징 대비 안전망. 재요청 시 갱신.
const LOCK_TTL_SEC = 300;

const lockKey = (minutesId: string) => `minutes:lock:${minutesId}`;

const LockSchema = z.object({ minutes_id: z.string().uuid() });

/*
 * 보유자 본인일 때만 삭제하는 원자적 해제(compare-and-del).
 * get→del 사이에 만료 후 타인이 재획득한 lock 을 잘못 지우지 않도록 Lua 로 처리.
 */
const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export function registerMinutesLockHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 이 소켓이 보유한 lock 들 — 연결 끊김 시 자동 해제용
  const heldLocks = new Set<string>();

  // minutes 가 속한 룸을 찾고, 호출자가 그 룸 멤버인지 검증. 멤버면 roomId 반환, 아니면 null.
  const resolveAuthorizedRoomId = async (
    minutesId: string,
  ): Promise<string | null> => {
    const minutes = await prisma.minutes.findUnique({
      where: { id: minutesId },
      select: { roomId: true },
    });
    if (minutes === null) {
      return null;
    }

    const membership = await prisma.roomMember.findFirst({
      where: { roomId: minutes.roomId, userId: user.id },
      select: { id: true },
    });

    return membership === null ? null : minutes.roomId;
  };

  // 보유자 본인 lock 을 해제하고 룸에 알린다.
  const releaseLock = async (minutesId: string): Promise<void> => {
    const removed = await redis.eval(
      RELEASE_SCRIPT,
      1,
      lockKey(minutesId),
      user.id,
    );
    heldLocks.delete(minutesId);

    // 실제로 내 lock 을 지운 경우에만 브로드캐스트(이미 만료/타인 소유면 0)
    if (removed === 1) {
      const minutes = await prisma.minutes.findUnique({
        where: { id: minutesId },
        select: { roomId: true },
      });
      if (minutes !== null) {
        io.to(minutes.roomId).emit('minutes:lock-released', {
          minutes_id: minutesId,
          user_id: user.id,
        });
      }
    }
  };

  socket.on('minutes:request-lock', async raw => {
    try {
      const { minutes_id } = LockSchema.parse(raw);

      const roomId = await resolveAuthorizedRoomId(minutes_id);
      if (roomId === null) {
        return; // 없는 회의록이거나 룸 멤버 아님 — 조용히 무시
      }

      const key = lockKey(minutes_id);
      const acquired = await redis.set(key, user.id, 'EX', LOCK_TTL_SEC, 'NX');

      // 본인이 이미 보유 중이면 재획득으로 간주(TTL 갱신)
      if (acquired === null && (await redis.get(key)) === user.id) {
        await redis.expire(key, LOCK_TTL_SEC);
      } else if (acquired === null) {
        // 타인이 편집 중 — 요청자에게만 거절
        socket.emit('minutes:lock-denied', {
          minutes_id,
          reason: 'already_locked',
        });
        return;
      }

      heldLocks.add(minutes_id);
      io.to(roomId).emit('minutes:lock-acquired', {
        minutes_id,
        user_id: user.id,
        login: user.login,
      });
    } catch (err) {
      const payload = toSocketError(
        err,
        'MINUTES_LOCK_ERROR',
        '편집 잠금 처리에 실패했습니다.',
      );
      logger.error({ err }, `[minutes:request-lock] ${user.login} error`);
      socket.emit('error', payload);
    }
  });

  socket.on('minutes:release-lock', async raw => {
    try {
      const { minutes_id } = LockSchema.parse(raw);
      await releaseLock(minutes_id);
    } catch (err) {
      const payload = toSocketError(
        err,
        'MINUTES_LOCK_ERROR',
        '편집 잠금 해제에 실패했습니다.',
      );
      logger.error({ err }, `[minutes:release-lock] ${user.login} error`);
      socket.emit('error', payload);
    }
  });

  // 연결 끊김 시 이 소켓이 쥔 lock 전부 해제(영구 잠금 방지)
  socket.on('disconnect', () => {
    for (const minutesId of [...heldLocks]) {
      void releaseLock(minutesId);
    }
  });
}
