'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchRoomPullRequests,
  type PullRequestState,
} from '@/services/github/api';

export const pullRequestQueryKeys = {
  all: ['pullRequests'] as const,
  room: (roomId: string, state: PullRequestState) =>
    [...pullRequestQueryKeys.all, roomId, state] as const,
};

interface UseRoomPullRequestsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  state?: PullRequestState;
}

export function useRoomPullRequests(
  roomId: string,
  {
    enabled = true,
    refetchInterval = 30_000,
    state = 'open',
  }: UseRoomPullRequestsOptions = {},
) {
  return useQuery({
    queryKey: pullRequestQueryKeys.room(roomId, state),
    queryFn: () => fetchRoomPullRequests({ roomId, state }),
    enabled: enabled && roomId !== '',
    refetchInterval,
  });
}
