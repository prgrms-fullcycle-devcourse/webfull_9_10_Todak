import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from './auth';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000', {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
      query: {
        token: getAuthToken() ? `Bearer ${getAuthToken()}` : '',
      },
    });
  }

  return socket;
}
