'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSocketEvent } from '@/hooks/useSocketEvent';

import { pullRequestQueryKeys } from './query';

export type PullRequestSocketEvent =
  | 'pr:opened'
  | 'pr:merged'
  | 'pr:closed'
  | 'pr:reviewed'
  | 'commit:pushed';

interface PullRequestSocketPayload {
  roomId?: string;
  room_id?: string;
  pull_request?: {
    number?: number;
    roomId?: string;
    room_id?: string;
  };
  review?: {
    pull_number?: number;
    roomId?: string;
    room_id?: string;
  };
}

interface CommitPushedSocketPayload {
  roomId?: string;
  room_id?: string;
  push?: {
    roomId?: string;
    room_id?: string;
  };
}

interface UsePullRequestSocketOptions {
  enabled?: boolean;
  onEvent?: (eventName: PullRequestSocketEvent) => void;
  onUpdated?: () => void;
  pullNumber?: number;
  roomId: string;
}

export function usePullRequestSocket({
  enabled = true,
  onEvent,
  onUpdated,
  pullNumber,
  roomId,
}: UsePullRequestSocketOptions) {
  const queryClient = useQueryClient();
  const isEnabled = enabled && roomId !== '';

  const handlePullRequestUpdate = useCallback(
    (
      eventName: PullRequestSocketEvent,
      data: PullRequestSocketPayload | CommitPushedSocketPayload,
    ) => {
      const payloadRoomId = getPullRequestEventRoomId(data);

      if (payloadRoomId && payloadRoomId !== roomId) {
        return;
      }

      const payloadPullNumber = getPullRequestEventPullNumber(data);

      if (
        pullNumber !== undefined &&
        payloadPullNumber !== undefined &&
        payloadPullNumber !== pullNumber
      ) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: pullRequestQueryKeys.all });

      if (pullNumber !== undefined) {
        queryClient.invalidateQueries({
          queryKey: pullRequestQueryKeys.detail(roomId, pullNumber),
        });
      }

      onEvent?.(eventName);
      onUpdated?.();
    },
    [onEvent, onUpdated, pullNumber, queryClient, roomId],
  );

  useSocketEvent<[PullRequestSocketPayload]>(
    'pr:opened',
    data => handlePullRequestUpdate('pr:opened', data),
    { enabled: isEnabled },
  );
  useSocketEvent<[PullRequestSocketPayload]>(
    'pr:merged',
    data => handlePullRequestUpdate('pr:merged', data),
    { enabled: isEnabled },
  );
  useSocketEvent<[PullRequestSocketPayload]>(
    'pr:closed',
    data => handlePullRequestUpdate('pr:closed', data),
    { enabled: isEnabled },
  );
  useSocketEvent<[PullRequestSocketPayload]>(
    'pr:reviewed',
    data => handlePullRequestUpdate('pr:reviewed', data),
    { enabled: isEnabled },
  );
  useSocketEvent<[CommitPushedSocketPayload]>(
    'commit:pushed',
    data => handlePullRequestUpdate('commit:pushed', data),
    { enabled: isEnabled },
  );
}

function getPullRequestEventRoomId(
  data: PullRequestSocketPayload | CommitPushedSocketPayload,
) {
  const pullRequestRoomId =
    'pull_request' in data
      ? (data.pull_request?.roomId ?? data.pull_request?.room_id)
      : undefined;
  const reviewRoomId =
    'review' in data
      ? (data.review?.roomId ?? data.review?.room_id)
      : undefined;
  const pushRoomId =
    'push' in data ? (data.push?.roomId ?? data.push?.room_id) : undefined;

  return (
    data.roomId ??
    data.room_id ??
    pullRequestRoomId ??
    reviewRoomId ??
    pushRoomId
  );
}

function getPullRequestEventPullNumber(
  data: PullRequestSocketPayload | CommitPushedSocketPayload,
) {
  if ('pull_request' in data && data.pull_request?.number !== undefined) {
    return data.pull_request.number;
  }

  if ('review' in data && data.review?.pull_number !== undefined) {
    return data.review.pull_number;
  }

  return undefined;
}
