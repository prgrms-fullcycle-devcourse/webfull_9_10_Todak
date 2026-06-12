'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPullRequestReview,
  fetchRoomPullRequestDetail,
  fetchRoomPullRequests,
  mergePullRequest,
  type CreatePullRequestReviewParams,
  type MergePullRequestParams,
  type PullRequestState,
} from '@/services/github/api';

export const pullRequestQueryKeys = {
  all: ['pullRequests'] as const,
  room: (roomId: string, state: PullRequestState) =>
    [...pullRequestQueryKeys.all, roomId, state] as const,
  detail: (roomId: string, pullNumber: number) =>
    [...pullRequestQueryKeys.all, roomId, 'detail', pullNumber] as const,
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

interface UseRoomPullRequestDetailOptions {
  enabled?: boolean;
}

export function useRoomPullRequestDetail(
  roomId: string,
  pullNumber: number,
  { enabled = true }: UseRoomPullRequestDetailOptions = {},
) {
  return useQuery({
    queryKey: pullRequestQueryKeys.detail(roomId, pullNumber),
    queryFn: () => fetchRoomPullRequestDetail({ roomId, pullNumber }),
    enabled: enabled && roomId !== '' && pullNumber > 0,
  });
}

export function useApprovePullRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...pullRequestQueryKeys.all, 'approve'],
    mutationFn: (params: Omit<CreatePullRequestReviewParams, 'event'>) =>
      createPullRequestReview({ ...params, event: 'APPROVE' }),
    onSuccess: (_result, params) => {
      queryClient.invalidateQueries({
        queryKey: pullRequestQueryKeys.detail(params.roomId, params.pullNumber),
      });
      queryClient.invalidateQueries({
        queryKey: pullRequestQueryKeys.all,
      });
    },
  });
}

export function useMergePullRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...pullRequestQueryKeys.all, 'merge'],
    mutationFn: (params: MergePullRequestParams) => mergePullRequest(params),
    onSuccess: (_result, params) => {
      queryClient.invalidateQueries({
        queryKey: pullRequestQueryKeys.detail(params.roomId, params.pullNumber),
      });
      queryClient.invalidateQueries({
        queryKey: pullRequestQueryKeys.all,
      });
    },
  });
}
