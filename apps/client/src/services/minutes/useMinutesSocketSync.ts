'use client';

import { useSocket } from '@/providers/SocketProvider';
import { useSpaceStore } from '@/store/useSpaceStore';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

import { minutesQueryKeys } from './query';

interface MinutesSocketPayload {
  roomId?: string;
  room_id?: string;
}

interface MinutesSocketRegistration {
  roomId: string;
  subscribers: number;
  dispose: () => void;
}

let registration: MinutesSocketRegistration | null = null;

export function useMinutesSocketSync(roomId: string) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (roomId === '') {
      return;
    }

    return subscribeMinutesSocketSync(roomId, queryClient, socket);
  }, [queryClient, roomId, socket]);
}

function subscribeMinutesSocketSync(
  roomId: string,
  queryClient: QueryClient,
  socket: Socket,
) {
  if (registration !== null && registration.roomId !== roomId) {
    registration.dispose();
    registration = null;
  }

  if (registration !== null) {
    registration.subscribers += 1;

    return () => {
      if (registration === null) {
        return;
      }

      registration.subscribers -= 1;

      if (registration.subscribers <= 0) {
        registration.dispose();
        registration = null;
      }
    };
  }

  const syncMinutes = (payload?: MinutesSocketPayload) => {
    const payloadRoomId = payload?.roomId ?? payload?.room_id;

    if (payloadRoomId && payloadRoomId !== roomId) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: minutesQueryKeys.all });
    useSpaceStore.getState().notifyMeetingMinutesUpdated();
  };
  socket.on('minutes:created', syncMinutes);
  socket.on('minutes:generation-started', syncMinutes);
  socket.on('minutes:generated', syncMinutes);
  socket.on('minutes:generation-failed', syncMinutes);
  socket.on('minutes:updated', syncMinutes);

  registration = {
    roomId,
    subscribers: 1,
    dispose: () => {
      socket.off('minutes:created', syncMinutes);
      socket.off('minutes:generation-started', syncMinutes);
      socket.off('minutes:generated', syncMinutes);
      socket.off('minutes:generation-failed', syncMinutes);
      socket.off('minutes:updated', syncMinutes);
    },
  };

  return () => {
    if (registration === null) {
      return;
    }

    registration.subscribers -= 1;

    if (registration.subscribers <= 0) {
      registration.dispose();
      registration = null;
    }
  };
}
