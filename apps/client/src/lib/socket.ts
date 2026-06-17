'use client';

import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(accessToken?: string) {
  if (typeof window === 'undefined') {
    throw new Error('클라이언트 사이드에서만 사용 가능합니다.');
  }

  if (socket === null) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    });
  }

  if (accessToken) {
    setSocketAuth(socket, accessToken);
  }

  return socket;
}

export function setSocketAuth(socket: Socket, accessToken: string) {
  const token = `Bearer ${accessToken}`;

  socket.auth = { token };
  socket.io.opts.query = { token };
}
