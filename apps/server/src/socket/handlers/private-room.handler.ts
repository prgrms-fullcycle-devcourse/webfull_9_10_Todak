import { getPrivateRooms } from '../../services/private-room.service.js';
import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * Private Room 소켓 핸들러
 * ────────────────────────────────────────────────────────────
 */
export function registerPrivateRoomHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  /*
   * 프라이빗 룸 입장
   * 1. 이미 열린 세션이 없으면 PrivateRoomSession 생성
   * 2. 룸 전체에 업데이트된 private-room 목록 broadcast
   */
  socket.on('private-room:enter', async ({ roomId, privateRoomId }) => {
    try {
      const { prisma } = await import('../../lib/prisma.js');

      const existing = await prisma.privateRoomSession.findFirst({
        where: { privateRoomId, userId: user.id, leftAt: null },
      });

      if (existing === null) {
        await prisma.privateRoomSession.create({
          data: { privateRoomId, userId: user.id },
        });
      }

      const privateRooms = await getPrivateRooms(roomId);

      io.to(roomId).emit('room:private-rooms-updated', privateRooms);

      console.log(
        `[private-room:enter] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      console.error('[private-room:enter] error:', err);
    }
  });

  /*
   * 프라이빗 룸 퇴장
   * 1. 해당 유저의 열린 세션에 leftAt = now 업데이트
   * 2. 룸 전체에 업데이트된 private-room 목록 broadcast
   */
  socket.on('private-room:leave', async ({ roomId, privateRoomId }) => {
    try {
      const { prisma } = await import('../../lib/prisma.js');

      await prisma.privateRoomSession.updateMany({
        where: { privateRoomId, userId: user.id, leftAt: null },
        data: { leftAt: new Date() },
      });

      const privateRooms = await getPrivateRooms(roomId);

      io.to(roomId).emit('room:private-rooms-updated', privateRooms);

      console.log(
        `[private-room:leave] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      console.error('[private-room:leave] error:', err);
    }
  });
}
