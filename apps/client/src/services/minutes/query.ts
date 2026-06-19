'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchRecentMeetingMinutes } from './api';
import type { MinutesList } from './model';

export const minutesQueryKeys = {
  all: ['minutes'] as const,
  detail: (roomId: string, minutesId: string) =>
    [...minutesQueryKeys.all, roomId, 'detail', minutesId] as const,
  recentMeeting: (roomId: string) =>
    [...minutesQueryKeys.all, roomId, 'recent-meeting'] as const,
};

interface UseRecentMeetingMinutesOptions {
  enabled?: boolean;
  initialData?: MinutesList;
}

export function useRecentMeetingMinutes(
  roomId: string,
  { enabled = true, initialData }: UseRecentMeetingMinutesOptions = {},
) {
  return useInfiniteQuery({
    queryKey: minutesQueryKeys.recentMeeting(roomId),
    queryFn: ({ pageParam }) =>
      fetchRecentMeetingMinutes(roomId, { page: pageParam }),
    enabled: enabled && roomId !== '',
    initialData:
      initialData === undefined
        ? undefined
        : { pageParams: [1], pages: [initialData] },
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      const { page, total_pages } = lastPage.pagination;

      return page < total_pages ? page + 1 : undefined;
    },
  });
}
