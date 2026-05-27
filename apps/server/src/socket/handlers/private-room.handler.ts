import { AppError } from '@/errors/AppError.js';

import {
  getPrivateRooms,
  enterPrivateRoom,
  leavePrivateRoom,
} from '../../services/private-room.service.js';
import { updateRoomMemberStatus } from '../../services/room-member.service.js';
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
   */
  socket.on('private-room:enter', async ({ roomId, privateRoomId }) => {
    try {
      // service 재사용
      await enterPrivateRoom(roomId, privateRoomId, user.id);

      // 상태 → meeting 자동 전환
      await updateRoomMemberStatus(user.id, roomId, 'meeting');
      io.to(roomId).emit('room:member-status-changed', {
        userId: user.id,
        status: 'meeting',
      });

      // 최신 상태 broadcast
      const privateRooms = await getPrivateRooms(roomId);

      io.to(roomId).emit('room:private-rooms-updated', privateRooms);

      console.log(
        `[private-room:enter] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      console.error('[private-room:enter] error:', err);

      socket.emit('error', {
        code: err instanceof AppError ? err.code : 'PRIVATE_ROOM_ENTER_ERROR',

        message:
          err instanceof Error
            ? err.message
            : '프라이빗 룸 입장 중 오류가 발생했습니다.',
      });
    }
  });

  /*
   * 프라이빗 룸 퇴장
   */
  socket.on('private-room:leave', async ({ roomId, privateRoomId }) => {
    try {
      // service 재사용
      await leavePrivateRoom(roomId, privateRoomId, user.id);

      // 상태 → focus 자동 복구
      await updateRoomMemberStatus(user.id, roomId, 'focus');
      io.to(roomId).emit('room:member-status-changed', {
        userId: user.id,
        status: 'focus',
      });

      // 최신 상태 broadcast
      const privateRooms = await getPrivateRooms(roomId);

      io.to(roomId).emit('room:private-rooms-updated', privateRooms);

      console.log(
        `[private-room:leave] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      console.error('[private-room:leave] error:', err);

      socket.emit('error', {
        code: err instanceof AppError ? err.code : 'PRIVATE_ROOM_LEAVE_ERROR',

        message:
          err instanceof Error
            ? err.message
            : '프라이빗 룸 퇴장 중 오류가 발생했습니다.',
      });
    }
  });
}
