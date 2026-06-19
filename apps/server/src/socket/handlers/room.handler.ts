import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { updateRoomMemberStatus } from '../../services/rooms/members/room-member.service.js';
import { clearActivePrivateRoomSessions } from '../../services/rooms/private-room/private-room.service.js';
import { assertRoomMember } from '../../services/rooms/room-guards.js';
import { broadcastPrivateRooms } from '../broadcast.js';
import { toSocketError } from '../socket-error.js';
import { TypedIO, TypedSocket } from '../socket.types.js';

// 이동 좌표 DB 저장 주기 (throttle) — 브로드캐스트는 실시간, 저장만 이 간격으로
const MOVE_SAVE_INTERVAL_MS = 500;

export function registerRoomHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 이 소켓의 마지막 좌표 저장 시각 (throttle 기준점)
  let lastMoveSavedAt = 0;

  // 룸 입장
  socket.on('room:join', async (roomId: string) => {
    // 멤버가 아닌 룸에 입장(=실시간 채팅·위치·상태 도청/주입)하지 못하도록 검증
    try {
      await assertRoomMember(roomId, user.id);
    } catch (err) {
      socket.emit(
        'error',
        toSocketError(err, 'ROOM_JOIN_ERROR', '룸 입장에 실패했습니다.'),
      );
      return;
    }

    await socket.join(roomId);
    socket.to(roomId).emit('room:user-joined', {
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
    logger.info(`[room:join] ${user.login} → ${roomId}`);

    // 재접속 시 away 상태를 focus로 복원 + 브로드캐스트
    try {
      await updateRoomMemberStatus(user.id, roomId, 'focus');
      io.to(roomId).emit('room:member-status-changed', {
        userId: user.id,
        status: 'focus',
      });
    } catch {
      logger.error(`[room:join] 상태 focus 리셋 실패: ${user.login}`);
    }

    // 안전망: 이전 비정상 종료로 남은 프라이빗룸 세션 정리 (disconnect 청소 누락/경합 대비)
    try {
      const affectedRoomIds = await clearActivePrivateRoomSessions(user.id);
      for (const affectedRoomId of affectedRoomIds) {
        await broadcastPrivateRooms(io, affectedRoomId);
      }
    } catch {
      logger.error(`[room:join] 프라이빗룸 세션 정리 실패: ${user.login}`);
    }
  });

  // 룸 퇴장
  socket.on('room:leave', async (roomId: string) => {
    await socket.leave(roomId);
    socket.to(roomId).emit('room:user-left', { userId: user.id });
    logger.info(`[room:leave] ${user.login} → ${roomId}`);
  });

  // 캐릭터 상태 변경 (focus | rest | meeting | away)
  socket.on('room:status-change', ({ roomId, status }) => {
    // join 하지 않은(=멤버 검증을 통과하지 않은) 룸에는 주입 불가 (in-memory 체크라 저렴)
    if (!socket.rooms.has(roomId)) {
      return;
    }
    socket.to(roomId).emit('room:member-status-changed', {
      userId: user.id,
      status,
    });
  });

  // 캐릭터 위치 이동
  socket.on('room:move', async ({ roomId, posX, posY }) => {
    // join 하지 않은 룸으로의 좌표 주입 차단
    if (!socket.rooms.has(roomId)) {
      return;
    }

    // 1. 실시간 브로드캐스트 (즉시 — 화면은 부드럽게)
    socket.to(roomId).emit('room:member-moved', {
      userId: user.id,
      posX,
      posY,
    });

    // 2. DB 저장 (0.5초에 1번만 — throttle, 새로고침 시 마지막 위치 복원용)
    const now = Date.now();
    if (now - lastMoveSavedAt >= MOVE_SAVE_INTERVAL_MS) {
      lastMoveSavedAt = now;
      try {
        await prisma.roomMember.updateMany({
          where: { roomId, userId: user.id },
          data: { posX, posY },
        });
      } catch {
        logger.error(`[room:move] 좌표 저장 실패: ${user.login}`);
      }
    }
  });
}
