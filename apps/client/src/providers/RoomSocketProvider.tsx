'use client';

import { useEffect, type ReactNode } from 'react';

import { useSocket } from '@/providers/SocketProvider';

interface RoomSocketProviderProps {
  children: ReactNode;
  roomId: string;
}

export function RoomSocketProvider({
  children,
  roomId,
}: RoomSocketProviderProps) {
  const { socket } = useSocket();

  useEffect(() => {
    if (roomId === '') {
      return;
    }

    const joinRoom = () => {
      socket.emit('room:join', roomId);
    };

    socket.on('connect', joinRoom);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off('connect', joinRoom);

      if (socket.connected) {
        socket.emit('room:leave', roomId);
      }
    };
  }, [roomId, socket]);

  return children;
}
