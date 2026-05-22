import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 룸 관련 소켓 이벤트 핸들러
 * ────────────────────────────────────────────────────────────
 */
export function registerRoomHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 룸 입장
  socket.on('room:join', async (roomId: string) => {
    await socket.join(roomId);
    socket.to(roomId).emit('room:user-joined', {
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
    console.log(`[room:join] ${user.login} → ${roomId}`);
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
  socket.on('room:move', ({ roomId, posX, posY }) => {
    socket.to(roomId).emit('room:member-moved', {
      userId: user.id,
      posX,
      posY,
    });
  });
}
