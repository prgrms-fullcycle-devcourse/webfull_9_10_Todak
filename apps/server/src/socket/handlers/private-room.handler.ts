import { logger } from '../../lib/logger.js';
import { updateRoomMemberStatus } from '../../services/rooms/members/room-member.service.js';
import {
  enterPrivateRoom,
  leavePrivateRoom,
} from '../../services/rooms/private-room/private-room.service.js';
import { broadcastPrivateRooms } from '../broadcast.js';
import { toSocketError } from '../socket-error.js';
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

      // 프라이빗 룸 채팅 채널 구독 (chat.handler 에서 io.to 로 broadcast)
      await socket.join(`private-room:${privateRoomId}`);
      // 상태 → meeting 자동 전환
      await updateRoomMemberStatus(user.id, roomId, 'meeting');
      io.to(roomId).emit('room:member-status-changed', {
        userId: user.id,
        status: 'meeting',
      });

      // 최신 상태 broadcast
      await broadcastPrivateRooms(io, roomId);

      logger.info(
        `[private-room:enter] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      logger.error({ err }, '[private-room:enter] error');
      socket.emit(
        'error',
        toSocketError(
          err,
          'PRIVATE_ROOM_ENTER_ERROR',
          '프라이빗 룸 입장 중 오류가 발생했습니다.',
        ),
      );
    }
  });

  /*
   * 프라이빗 룸 퇴장
   */
  socket.on('private-room:leave', async ({ roomId, privateRoomId }) => {
    try {
      // service 재사용
      await leavePrivateRoom(roomId, privateRoomId, user.id);

      // 프라이빗 룸 채팅 채널 구독 해제
      await socket.leave(`private-room:${privateRoomId}`);
      // 상태 → focus 자동 복구
      await updateRoomMemberStatus(user.id, roomId, 'focus');
      io.to(roomId).emit('room:member-status-changed', {
        userId: user.id,
        status: 'focus',
      });

      // 최신 상태 broadcast
      await broadcastPrivateRooms(io, roomId);

      logger.info(
        `[private-room:leave] ${user.login} → privateRoom:${privateRoomId}`,
      );
    } catch (err) {
      logger.error({ err }, '[private-room:leave] error');
      socket.emit(
        'error',
        toSocketError(
          err,
          'PRIVATE_ROOM_LEAVE_ERROR',
          '프라이빗 룸 퇴장 중 오류가 발생했습니다.',
        ),
      );
    }
  });
}
