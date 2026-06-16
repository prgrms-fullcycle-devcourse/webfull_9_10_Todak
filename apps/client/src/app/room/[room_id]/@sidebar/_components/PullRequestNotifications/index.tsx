'use client';

import { cn } from '@/lib/cn';
import { getAuthToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import {
  pullRequestQueryKeys,
  useRoomPullRequests,
} from '@/services/github/query';
import type { RoomPullRequest } from '@/services/github/api';
import { Accordion, Button, Chip } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import PullRequestModal, {
  type PullRequestModalData,
} from './PullRequestModal';

interface PullRequestSocketPayload {
  roomId?: string;
  room_id?: string;
  pull_request?: {
    roomId?: string;
    room_id?: string;
  };
  review?: {
    roomId?: string;
    room_id?: string;
  };
}

interface PullRequestNotificationsProps {
  className?: string;
}

export default function PullRequestNotifications({
  className,
}: PullRequestNotificationsProps) {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const queryClient = useQueryClient();
  const {
    data: pullRequestsResponse,
    isError,
    isPending,
  } = useRoomPullRequests(roomID);
  const [selectedPullRequest, setSelectedPullRequest] =
    useState<PullRequestModalData | null>(null);
  const [hasPullRequestUpdate, setHasPullRequestUpdate] = useState(false);
  const [isPullRequestExpanded, setIsPullRequestExpanded] = useState(false);
  const isPullRequestExpandedRef = useRef(isPullRequestExpanded);
  const pullRequestListSignatureRef = useRef<string | null>(null);
  const isModalOpen = selectedPullRequest !== null;
  const visibleRoomPullRequests = useMemo(
    () =>
      (pullRequestsResponse?.pull_requests ?? []).filter(
        pullRequest => pullRequest.state.toLowerCase() !== 'closed',
      ),
    [pullRequestsResponse?.pull_requests],
  );
  const pullRequests = useMemo(
    () =>
      visibleRoomPullRequests.map(pullRequest =>
        mapPullRequestToModalData(pullRequest),
      ),
    [visibleRoomPullRequests],
  );
  const pullRequestListSignature = useMemo(() => {
    if (!pullRequestsResponse) {
      return null;
    }

    return visibleRoomPullRequests
      .map(
        pullRequest =>
          `${pullRequest.number}:${pullRequest.state}:${pullRequest.is_merged}:${pullRequest.updated_at}`,
      )
      .join('|');
  }, [pullRequestsResponse, visibleRoomPullRequests]);

  useEffect(() => {
    isPullRequestExpandedRef.current = isPullRequestExpanded;
  }, [isPullRequestExpanded]);

  useEffect(() => {
    if (pullRequestListSignature === null) {
      return;
    }

    if (pullRequestListSignatureRef.current === null) {
      pullRequestListSignatureRef.current = pullRequestListSignature;
      return;
    }

    if (pullRequestListSignatureRef.current === pullRequestListSignature) {
      return;
    }

    pullRequestListSignatureRef.current = pullRequestListSignature;

    if (!isPullRequestExpandedRef.current) {
      setHasPullRequestUpdate(true);
    }
  }, [pullRequestListSignature]);

  useEffect(() => {
    const socket = getSocket(getAuthToken() ?? undefined);
    const handlePullRequestEvent = (data: PullRequestSocketPayload) => {
      const payloadRoomId = getPullRequestEventRoomId(data);

      if (payloadRoomId && payloadRoomId !== roomID) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: pullRequestQueryKeys.all });

      if (!isPullRequestExpandedRef.current) {
        setHasPullRequestUpdate(true);
      }
    };
    const joinRoom = () => {
      socket.emit('room:join', roomID);
    };

    socket.on('connect', joinRoom);

    if (!socket.connected) {
      socket.connect();
    } else {
      joinRoom();
    }

    socket.on('pr:opened', handlePullRequestEvent);
    socket.on('pr:merged', handlePullRequestEvent);
    socket.on('pr:closed', handlePullRequestEvent);
    socket.on('pr:reviewed', handlePullRequestEvent);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('pr:opened', handlePullRequestEvent);
      socket.off('pr:merged', handlePullRequestEvent);
      socket.off('pr:closed', handlePullRequestEvent);
      socket.off('pr:reviewed', handlePullRequestEvent);
    };
  }, [queryClient, roomID]);

  const handlePullRequestTriggerPress = () => {
    setIsPullRequestExpanded(current => {
      const next = !current;

      if (next) {
        setHasPullRequestUpdate(false);
      }

      return next;
    });
  };

  return (
    <>
      <Accordion.Item className={className} id="pull-requests">
        <Accordion.Heading>
          <Accordion.Trigger
            className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left"
            onPress={handlePullRequestTriggerPress}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[11px] font-black tracking-tight text-muted">
                PR 리뷰
              </span>
              {hasPullRequestUpdate && (
                <Chip
                  className="h-4 rounded-md bg-accent/10 px-1.5 text-[8px] font-bold text-accent"
                  role="status"
                  size="sm"
                  variant="soft"
                >
                  NEW
                </Chip>
              )}
            </div>

            <Accordion.Indicator className="size-3.5 text-muted" />
          </Accordion.Trigger>
        </Accordion.Heading>

        <Accordion.Panel className="max-h-44 space-y-1.5 overflow-y-auto pb-3 pr-1">
          {isPending ? (
            <PullRequestMessage>PR을 불러오는 중입니다...</PullRequestMessage>
          ) : isError ? (
            <PullRequestMessage variant="error">
              PR을 불러오지 못했습니다.
            </PullRequestMessage>
          ) : pullRequests.length > 0 ? (
            pullRequests.map(pullRequest => (
              <PullRequestItem
                key={`pull-request-notification-${pullRequest.id}`}
                onSelect={setSelectedPullRequest}
                pullRequest={pullRequest}
              />
            ))
          ) : (
            <PullRequestMessage>표시할 PR이 없습니다.</PullRequestMessage>
          )}
        </Accordion.Panel>
      </Accordion.Item>

      {selectedPullRequest !== null && (
        <PullRequestModal
          isOpen={isModalOpen}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setSelectedPullRequest(null);
            }
          }}
          pullRequest={selectedPullRequest}
          roomID={roomID}
        />
      )}
    </>
  );
}

function getPullRequestEventRoomId(data: PullRequestSocketPayload) {
  return (
    data.roomId ??
    data.room_id ??
    data.pull_request?.roomId ??
    data.pull_request?.room_id ??
    data.review?.roomId ??
    data.review?.room_id
  );
}

function mapPullRequestToModalData(
  pullRequest: RoomPullRequest,
): PullRequestModalData {
  const author = pullRequest.author?.github_username ?? '알 수 없음';

  return {
    id: pullRequest.number,
    title: pullRequest.title,
    updatedAt: formatRelativeTime(pullRequest.updated_at),
    author,
    state: pullRequest.state,
    isDraft: pullRequest.is_draft,
    isMerged: pullRequest.is_merged,
    branch: pullRequest.branch,
    assignees: pullRequest.assignees.map(assignee => assignee.github_username),
    labels: pullRequest.labels,
    url: pullRequest.html_url,
  };
}

function formatRelativeTime(value: string) {
  const updatedAt = new Date(value).getTime();

  if (Number.isNaN(updatedAt)) {
    return '';
  }

  const diffInSeconds = Math.round((updatedAt - Date.now()) / 1000);
  const units = [
    { name: 'year', seconds: 60 * 60 * 24 * 365 },
    { name: 'month', seconds: 60 * 60 * 24 * 30 },
    { name: 'day', seconds: 60 * 60 * 24 },
    { name: 'hour', seconds: 60 * 60 },
    { name: 'minute', seconds: 60 },
  ] as const;

  for (const unit of units) {
    if (Math.abs(diffInSeconds) >= unit.seconds) {
      return new Intl.RelativeTimeFormat('ko-KR', {
        numeric: 'auto',
      }).format(Math.round(diffInSeconds / unit.seconds), unit.name);
    }
  }

  return '방금 전';
}

function PullRequestMessage({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'error';
}) {
  return (
    <p
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-[10px] font-bold',
        variant === 'error'
          ? 'bg-accent/10 text-accent'
          : 'bg-surface-secondary text-muted',
      )}
    >
      {children}
    </p>
  );
}

function PullRequestItem({
  onSelect,
  pullRequest,
}: {
  onSelect: (pullRequest: PullRequestModalData) => void;
  pullRequest: PullRequestModalData;
}) {
  return (
    <Button
      className="group grid h-auto min-h-8 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-left shadow-none transition-colors hover:bg-surface-tertiary"
      onClick={() => onSelect(pullRequest)}
      type="button"
      variant="ghost"
    >
      <span className="font-todak-mono text-[10px] font-black text-accent">
        #{pullRequest.id}
      </span>
      <h3 className="truncate text-[10px] font-black text-foreground">
        {pullRequest.title}
      </h3>
      <time className="font-todak-mono text-[8px] font-black text-muted">
        {pullRequest.updatedAt}
      </time>
    </Button>
  );
}
