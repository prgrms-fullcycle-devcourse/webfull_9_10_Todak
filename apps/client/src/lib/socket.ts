import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(accessToken?: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000', {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    });
  }

  if (accessToken) {
    socket.auth = { token: `Bearer ${accessToken}` };
    socket.io.opts.query = { token: `Bearer ${accessToken}` };
  }

  return socket;
}
