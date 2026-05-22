import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 채팅 관련 소켓 이벤트 핸들러
 * ────────────────────────────────────────────────────────────
 */
export function registerChatHandlers(_io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 메시지 전송
  socket.on('chat:send', ({ roomId, content, privateRoomId }) => {
    const target = privateRoomId !== undefined ? privateRoomId : roomId;

    socket.to(target).emit('chat:message', {
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
    });

    // TODO: DB에 채팅 메시지 저장
    console.log(`[chat:send] ${user.login} → ${target}: ${content}`);
  });
}
