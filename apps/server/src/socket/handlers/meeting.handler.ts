import { TypedIO, TypedSocket } from '../socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 회의실 관련 소켓 이벤트 핸들러
 * ────────────────────────────────────────────────────────────
 */
export function registerMeetingHandlers(_io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  // 회의 시작
  socket.on('meeting:start', ({ roomId, privateRoomId }) => {
    // TODO: DB에 MEETING 레코드 생성
    socket.to(roomId).emit('meeting:started', {
      meetingId: privateRoomId, // 임시 - DB 생성 후 실제 meetingId 로 교체
      hostId: user.id,
    });
    console.log(`[meeting:start] ${user.login} → room:${roomId}`);
  });

  // 회의 종료
  socket.on('meeting:end', ({ meetingId }) => {
    // TODO: DB MEETING 상태 ended 로 업데이트
    socket.to(meetingId).emit('meeting:ended', { meetingId });
    console.log(`[meeting:end] ${user.login} → meeting:${meetingId}`);
  });

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
