import { Server as HttpServer } from 'http';

import { Server as SocketServer } from 'socket.io';

import { env } from '../config/env';

import { registerSocketHandlers } from './handlers';

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', socket => {
    registerSocketHandlers(socket);
  });

  return io;
}
