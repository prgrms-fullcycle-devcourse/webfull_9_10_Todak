'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useSpaceStore } from '@/store/useSpaceStore';

import { minutesQueryKeys } from './query';

export type MinutesSocketEvent =
  | 'minutes:created'
  | 'minutes:generation-started'
  | 'minutes:generated'
  | 'minutes:generation-failed'
  | 'minutes:updated';

interface MinutesSocketPayload {
  roomId?: string;
  room_id?: string;
}

interface UseMinutesSocketOptions {
  enabled?: boolean;
  onEvent?: (eventName: MinutesSocketEvent) => void;
  onUpdated?: () => void;
  roomId: string;
}

export function useMinutesSocket({
  enabled = true,
  onEvent,
  onUpdated,
  roomId,
}: UseMinutesSocketOptions) {
  const queryClient = useQueryClient();
  const isEnabled = enabled && roomId !== '';

  const handleMinutesUpdate = useCallback(
    (eventName: MinutesSocketEvent, payload?: MinutesSocketPayload) => {
      const payloadRoomId = payload?.roomId ?? payload?.room_id;

      if (payloadRoomId && payloadRoomId !== roomId) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: minutesQueryKeys.all });
      useSpaceStore.getState().notifyMeetingMinutesUpdated();
      onEvent?.(eventName);
      onUpdated?.();
    },
    [onEvent, onUpdated, queryClient, roomId],
  );

  useSocketEvent<[MinutesSocketPayload | undefined]>(
    'minutes:created',
    payload => handleMinutesUpdate('minutes:created', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[MinutesSocketPayload | undefined]>(
    'minutes:generation-started',
    payload => handleMinutesUpdate('minutes:generation-started', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[MinutesSocketPayload | undefined]>(
    'minutes:generated',
    payload => handleMinutesUpdate('minutes:generated', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[MinutesSocketPayload | undefined]>(
    'minutes:generation-failed',
    payload => handleMinutesUpdate('minutes:generation-failed', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[MinutesSocketPayload | undefined]>(
    'minutes:updated',
    payload => handleMinutesUpdate('minutes:updated', payload),
    { enabled: isEnabled },
  );
}
