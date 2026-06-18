import { Server as HttpServer } from 'http';

import { Server as SocketServer } from 'socket.io';

import { env } from '../config/env.js';
import { setUserStatusInAllRooms } from '../services/rooms/members/room-member.service.js';
import { clearActivePrivateRoomSessions } from '../services/rooms/private-room/private-room.service.js';

import { broadcastPrivateRooms } from './broadcast.js';
import { registerHandlers } from './handlers/index.js';
import {
  claimActiveSession,
  clearAllActiveSessions,
  releaseActiveSession,
} from './socket-session.js';
import { socketAuthMiddleware } from './socket.auth.js';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  TypedIO,
} from './socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * 싱글톤 io 인스턴스
 * API 라우트나 서비스에서 이벤트를 emit 하려면 getIO() 사용
 * ────────────────────────────────────────────────────────────
 */
let io: TypedIO;

export function initSocket(httpServer: HttpServer): TypedIO {
  io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CLIENT_URL.split(',').map(s => s.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT 인증 미들웨어 적용
  io.use(socketAuthMiddleware);

  io.on('connection', socket => {
    const { id: userId, login } = socket.data.user;
    console.log(`🔌 [${login}] connected (${socket.id})`);

    const previousSocketId = claimActiveSession(userId, socket.id);
    if (previousSocketId !== null) {
      const previousSocket = io.sockets.sockets.get(previousSocketId);
      if (previousSocket !== undefined) {
        previousSocket.data.replacedByNewSession = true;
        previousSocket.emit('session:replaced', {
          message:
            '다른 탭 또는 브라우저에서 접속하여 이 연결이 종료되었습니다.',
        });
        previousSocket.disconnect(true);
        console.log(
          `🔌 [${login}] replaced previous session (${previousSocketId})`,
        );
      }
    }

    // 개인 알림 라우팅용 개인방(userId) 입장 → to(userId).emit('notification:created')
    void socket.join(userId);

    registerHandlers(io, socket);

    socket.on('disconnect', async () => {
      console.log(`🔌 [${login}] disconnected (${socket.id})`);

      if (
        socket.data.replacedByNewSession ||
        !releaseActiveSession(userId, socket.id)
      ) {
        return;
      }

      try {
        const roomIds = await setUserStatusInAllRooms(
          socket.data.user.id,
          'away',
        );
        for (const roomId of roomIds) {
          io.to(roomId).emit('room:member-status-changed', {
            userId: socket.data.user.id,
            status: 'away',
          });
        }
      } catch {
        console.error(`[disconnect] status away 처리 실패: ${login}`);
      }

      // 비정상 종료(새로고침/탭닫기)로 남은 프라이빗룸 세션 정리 + 다른 멤버 화면 갱신
      try {
        const affectedRoomIds = await clearActivePrivateRoomSessions(
          socket.data.user.id,
        );
        for (const roomId of affectedRoomIds) {
          await broadcastPrivateRooms(io, roomId);
        }
      } catch {
        console.error(`[disconnect] 프라이빗룸 세션 정리 실패: ${login}`);
      }
    });
  });

  return io;
}

/*
 * ────────────────────────────────────────────────────────────
 * 어디서든 io 인스턴스를 가져올 수 있는 함수
 *
 * 사용 예시 (API 라우트, 서비스 등):
 *   import { getIO } from '../socket/index.js';
 *   getIO().to(roomId).emit('chat:message', { ... });
 * ────────────────────────────────────────────────────────────
 */
/*
 * 그레이스풀 셧다운 시 호출한다.
 * 연결된 모든 소켓 클라이언트를 끊는다. (HTTP 서버는 server.ts에서 별도로 닫는다)
 */
export function closeSocket() {
  if (io === undefined) {
    return;
  }
  // close: true → 하부 연결까지 강제로 종료해 httpServer가 드레인될 수 있게 한다
  io.disconnectSockets(true);
  clearAllActiveSessions();
  console.log('✅ Socket connections closed');
}

export function getIO(): TypedIO {
  if (io === undefined) {
    throw new Error(
      'Socket.io 가 초기화되지 않았습니다. initSocket() 을 먼저 호출하세요.',
    );
  }

  return io;
}
