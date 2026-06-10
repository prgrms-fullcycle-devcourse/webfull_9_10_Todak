import { prisma } from '../../lib/prisma.js';
import { clearActivePrivateRoomSessions } from '../../services/private-room.service.js';
import { broadcastPrivateRooms } from '../broadcast.js';
import { TypedIO, TypedSocket } from '../socket.types.js';

// 이동 좌표 DB 저장 주기 (throttle) — 브로드캐스트는 실시간, 저장만 이 간격으로
const MOVE_SAVE_INTERVAL_MS = 500;

export function registerRoomHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 이 소켓의 마지막 좌표 저장 시각 (throttle 기준점)
  let lastMoveSavedAt = 0;

  // 룸 입장
  socket.on('room:join', async (roomId: string) => {
    await socket.join(roomId);
    socket.to(roomId).emit('room:user-joined', {
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
    console.log(`[room:join] ${user.login} → ${roomId}`);

    // 안전망: 이전 비정상 종료로 남은 프라이빗룸 세션 정리 (disconnect 청소 누락/경합 대비)
    try {
      const affectedRoomIds = await clearActivePrivateRoomSessions(user.id);
      for (const affectedRoomId of affectedRoomIds) {
        await broadcastPrivateRooms(io, affectedRoomId);
      }
    } catch {
      console.error(`[room:join] 프라이빗룸 세션 정리 실패: ${user.login}`);
    }
  });

  // 룸 퇴장
  socket.on('room:leave', async (roomId: string) => {
    await socket.leave(roomId);
    socket.to(roomId).emit('room:user-left', { userId: user.id });
    console.log(`[room:leave] ${user.login} → ${roomId}`);
  });

  // 캐릭터 상태 변경 (focus | rest | meeting | away)
  socket.on('room:status-change', ({ roomId, status }) => {
    socket.to(roomId).emit('room:member-status-changed', {
      userId: user.id,
      status,
    });
  });

  // 캐릭터 위치 이동
  socket.on('room:move', async ({ roomId, posX, posY }) => {
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
        console.error(`[room:move] 좌표 저장 실패: ${user.login}`);
      }
    }
  });
}
