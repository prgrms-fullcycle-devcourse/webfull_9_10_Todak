import { verifyJwt } from '../services/auth.service.js';

import { TypedSocket } from './socket.types.js';

/*
 * ────────────────────────────────────────────────────────────
 * Socket.io JWT 인증 미들웨어
 * 클라이언트 연결 시 handshake.auth.token 으로 JWT 검증
 *
 * 클라이언트 사용법:
 *   const socket = io('http://localhost:4000', {
 *     auth: { token: 'Bearer eyJ...' }
 *   });
 * ────────────────────────────────────────────────────────────
 */
export function socketAuthMiddleware(
  socket: TypedSocket,
  next: (err?: Error) => void,
) {
  try {
    const raw = socket.handshake.auth['token'] as string | undefined;

    if (raw === undefined || raw === '') {
      return next(new Error('UNAUTHORIZED'));
    }

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const user = verifyJwt(token);

    socket.data.user = user;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
}
