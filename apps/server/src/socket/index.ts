import { Server as HttpServer } from 'http';

import { Server as SocketServer } from 'socket.io';

import { env } from '../config/env.js';

import { registerHandlers } from './handlers/index.js';
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
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT 인증 미들웨어 적용
  io.use(socketAuthMiddleware);

  io.on('connection', socket => {
    const { login } = socket.data.user;
    console.log(`🔌 [${login}] connected (${socket.id})`);

    registerHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 [${login}] disconnected (${socket.id})`);
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
export function getIO(): TypedIO {
  if (io === undefined) {
    throw new Error(
      'Socket.io 가 초기화되지 않았습니다. initSocket() 을 먼저 호출하세요.',
    );
  }

  return io;
}
