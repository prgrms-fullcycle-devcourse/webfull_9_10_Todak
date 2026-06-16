'use client';

import { getAuthToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useSpaceStore } from '@/store/useSpaceStore';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (roomId === '') {
      return;
    }

    return subscribeMinutesSocketSync(roomId, queryClient);
  }, [queryClient, roomId]);
}

function subscribeMinutesSocketSync(roomId: string, queryClient: QueryClient) {
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

  const socket = getSocket(getAuthToken() ?? undefined);
  const syncMinutes = (payload?: MinutesSocketPayload) => {
    const payloadRoomId = payload?.roomId ?? payload?.room_id;

    if (payloadRoomId && payloadRoomId !== roomId) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: minutesQueryKeys.all });
    useSpaceStore.getState().notifyMeetingMinutesUpdated();
  };
  const joinRoom = () => {
    socket.emit('room:join', roomId);
  };

  socket.on('connect', joinRoom);

  if (!socket.connected) {
    socket.connect();
  } else {
    joinRoom();
  }

  socket.on('minutes:created', syncMinutes);
  socket.on('minutes:generation-started', syncMinutes);
  socket.on('minutes:generated', syncMinutes);
  socket.on('minutes:generation-failed', syncMinutes);
  socket.on('minutes:updated', syncMinutes);

  registration = {
    roomId,
    subscribers: 1,
    dispose: () => {
      socket.off('connect', joinRoom);
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
