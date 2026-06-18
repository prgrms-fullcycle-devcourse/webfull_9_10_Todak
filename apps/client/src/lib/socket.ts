'use client';

import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;
let noopSocket: Socket | null = null;

export function getSocket(accessToken?: string) {
  if (typeof window === 'undefined') {
    return getNoopSocket();
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

function getNoopSocket() {
  if (noopSocket !== null) {
    return noopSocket;
  }

  noopSocket = {
    connected: false,
    auth: {},
    io: {
      opts: {},
    },
    connect() {
      return this;
    },
    disconnect() {
      return this;
    },
    emit() {
      return this;
    },
    on() {
      return this;
    },
    off() {
      return this;
    },
  } as unknown as Socket;

  return noopSocket;
}
