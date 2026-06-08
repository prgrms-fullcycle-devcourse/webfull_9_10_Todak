'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchNotifications } from './api';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  room: (roomID: string) => [...notificationQueryKeys.all, roomID] as const,
};

interface UseNotificationsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useNotifications(
  roomID: string,
  { enabled = true, refetchInterval = 30_000 }: UseNotificationsOptions = {},
) {
  return useQuery({
    queryKey: notificationQueryKeys.room(roomID),
    queryFn: () => fetchNotifications(roomID),
    enabled: enabled && roomID !== '',
    refetchInterval,
  });
}
