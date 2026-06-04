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
    await socket.join(meetingId);
    socket.to(meetingId).emit('meeting:user-joined', {
      userId: user.id,
      login: user.login,
    });
    console.log(`[meeting:join] ${user.login} → meeting:${meetingId}`);
  });

  // 회의 퇴장
  socket.on('meeting:leave', async ({ meetingId }) => {
    await socket.leave(meetingId);
    socket.to(meetingId).emit('meeting:user-left', { userId: user.id });
    console.log(`[meeting:leave] ${user.login} → meeting:${meetingId}`);
  });
}
