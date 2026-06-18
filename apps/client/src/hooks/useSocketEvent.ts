'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

import { useSocket } from '@/providers/SocketProvider';

type SocketEventHandler<TArgs extends unknown[]> = (...args: TArgs) => void;

export function useSocketEvent<TArgs extends unknown[]>(
  eventName: string,
  handler: SocketEventHandler<TArgs>,
  options?: {
    enabled?: boolean;
    socket?: Socket;
  },
) {
  const context = useSocket();
  const socket = options?.socket ?? context.socket;
  const enabled = options?.enabled ?? true;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventHandler = (...args: TArgs) => {
      handlerRef.current(...args);
    };

    socket.on(eventName, eventHandler);

    return () => {
      socket.off(eventName, eventHandler);
    };
  }, [enabled, eventName, socket]);
}
