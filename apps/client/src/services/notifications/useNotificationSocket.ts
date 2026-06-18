'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSocketEvent } from '@/hooks/useSocketEvent';

import type {
  RoomNotification,
  SocketIssuePayload,
  SocketPrPayload,
  SocketReviewPayload,
} from './model';
import { notificationQueryKeys } from './query';

export type NotificationSocketEvent =
  | 'notification:created'
  | 'pr:opened'
  | 'pr:merged'
  | 'pr:reviewed'
  | 'issue:created';

type NotificationSocketPayload =
  | RoomNotification
  | SocketPrPayload
  | SocketReviewPayload
  | SocketIssuePayload;

interface UseNotificationSocketOptions {
  enabled?: boolean;
  onEvent?: (eventName: NotificationSocketEvent) => void;
  onUpdated?: () => void;
  roomId: string;
}

export function useNotificationSocket({
  enabled = true,
  onEvent,
  onUpdated,
  roomId,
}: UseNotificationSocketOptions) {
  const queryClient = useQueryClient();
  const isEnabled = enabled && roomId !== '';

  const handleNotificationUpdate = useCallback(
    (
      eventName: NotificationSocketEvent,
      payload: NotificationSocketPayload,
    ) => {
      const payloadRoomId = getNotificationEventRoomId(payload);

      if (payloadRoomId && payloadRoomId !== roomId) {
        console.info('[notification-socket] ignored room event', {
          eventName,
          payloadRoomId,
          roomId,
        });
        return;
      }

      console.info('[notification-socket] received event', {
        eventName,
        payload,
        roomId,
      });

      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomId),
      });
      onEvent?.(eventName);
      onUpdated?.();
    },
    [onEvent, onUpdated, queryClient, roomId],
  );

  useSocketEvent<[RoomNotification]>(
    'notification:created',
    payload => handleNotificationUpdate('notification:created', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[SocketPrPayload]>(
    'pr:opened',
    payload => handleNotificationUpdate('pr:opened', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[SocketPrPayload]>(
    'pr:merged',
    payload => handleNotificationUpdate('pr:merged', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[SocketReviewPayload]>(
    'pr:reviewed',
    payload => handleNotificationUpdate('pr:reviewed', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[SocketIssuePayload]>(
    'issue:created',
    payload => handleNotificationUpdate('issue:created', payload),
    { enabled: isEnabled },
  );
}

function getNotificationEventRoomId(payload: NotificationSocketPayload) {
  return 'room_id' in payload ? payload.room_id : payload.roomId;
}
