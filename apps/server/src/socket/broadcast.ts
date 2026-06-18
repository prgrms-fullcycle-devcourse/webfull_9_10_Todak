import { getPrivateRooms } from '../services/rooms/private-room/private-room.service.js';

import { TypedIO } from './socket.types.js';

/*
 * 해당 룸의 모든 멤버에게 최신 프라이빗룸 상태를 broadcast 한다.
 * 입장/퇴장(REST·socket)·회의 시작/종료 후, is_meeting_active 등 변동을
 * 다른 멤버 화면에 즉시 반영하기 위해 호출한다.
 *
 * io 를 인자로 받는다 (getIO() 를 내부에서 부르면 socket/index → handlers →
 * 이 파일 → index 로 순환 의존이 생기므로 호출부가 넘겨준다).
 */
export async function broadcastPrivateRooms(
  io: TypedIO,
  roomId: string,
): Promise<void> {
  io.to(roomId).emit(
    'room:private-rooms-updated',
    await getPrivateRooms(roomId),
  );
}
