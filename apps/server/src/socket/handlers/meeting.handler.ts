import { AppError } from '../../errors/AppError.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { assertRoomMember } from '../../services/rooms/room-guards.js';
import { toSocketError } from '../socket-error.js';
import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 회의실 관련 소켓 이벤트 핸들러
 *
 * 회의 시작/종료(DB 쓰기 + meeting:started / meeting:ended broadcast)는
 * REST(POST /rooms/:roomId/meetings, .../:meetingId/end)가 담당한다.
 * 여기서는 회의 소켓 room 입·퇴장만 처리.
 * ────────────────────────────────────────────────────────────
 */
export function registerMeetingHandlers(_io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 회의 참여
  socket.on('meeting:join', async ({ meetingId }) => {
    try {
      // 회의가 속한 룸의 멤버만 입장 가능 (타 룸 회의 도청/주입 차단)
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: { roomId: true },
      });
      if (meeting === null) {
        throw new AppError('MEETING_NOT_FOUND');
      }
      await assertRoomMember(meeting.roomId, user.id);

      await socket.join(meetingId);
      socket.to(meetingId).emit('meeting:user-joined', {
        userId: user.id,
        login: user.login,
      });
      logger.info(`[meeting:join] ${user.login} → meeting:${meetingId}`);
    } catch (err) {
      logger.error({ err }, `[meeting:join] ${user.login} error`);
      socket.emit(
        'error',
        toSocketError(err, 'MEETING_JOIN_ERROR', '회의 참여에 실패했습니다.'),
      );
    }
  });

  // 회의 퇴장
  socket.on('meeting:leave', async ({ meetingId }) => {
    try {
      await socket.leave(meetingId);
      socket.to(meetingId).emit('meeting:user-left', { userId: user.id });
      logger.info(`[meeting:leave] ${user.login} → meeting:${meetingId}`);
    } catch (err) {
      logger.error({ err }, `[meeting:leave] ${user.login} error`);
      socket.emit(
        'error',
        toSocketError(err, 'MEETING_LEAVE_ERROR', '회의 퇴장에 실패했습니다.'),
      );
    }
  });
}
