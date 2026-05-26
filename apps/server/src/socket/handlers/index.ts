import { TypedIO, TypedSocket } from '../socket.types.js';

import { registerChatHandlers } from './chat.handler.js';
import { registerMeetingHandlers } from './meeting.handler.js';
import { registerPrivateRoomHandlers } from './private-room.handler.js';
import { registerRoomHandlers } from './room.handler.js';

/*
 * ────────────────────────────────────────────────────────────
 * 핸들러 등록 진입점
 * 새 핸들러 파일을 만들면 여기에 추가
 * ────────────────────────────────────────────────────────────
 */
export function registerHandlers(io: TypedIO, socket: TypedSocket) {
  registerRoomHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerMeetingHandlers(io, socket);
  registerPrivateRoomHandlers(io, socket);
}
