'use client';

import { cn } from '@/lib/cn';
import { useRoomPullRequests } from '@/services/github/query';
import type { RoomPullRequest } from '@/services/github/api';
import { Accordion, Chip } from '@heroui/react';
import { useParams } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

import PullRequestModal, {
  type PullRequestModalData,
} from './PullRequestModal';

interface PullRequestNotificationsProps {
  className?: string;
}

export default function PullRequestNotifications({
  className,
}: PullRequestNotificationsProps) {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const {
    data: pullRequestsResponse,
    isError,
    isPending,
  } = useRoomPullRequests(roomID);
  const [selectedPullRequest, setSelectedPullRequest] =
    useState<PullRequestModalData | null>(null);
  const isModalOpen = selectedPullRequest !== null;
  const pullRequests = useMemo(
    () =>
      (pullRequestsResponse?.pull_requests ?? []).map(pullRequest =>
        mapPullRequestToModalData(pullRequest),
      ),
    [pullRequestsResponse?.pull_requests],
  );

  return (
    <>
      <Accordion.Item className={className} id="pull-requests">
        <Accordion.Heading>
          <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[11px] font-black tracking-tight text-muted">
                PR 리뷰
              </span>
            </div>

            <Chip
              className="h-5 shrink-0 rounded-md bg-accent/10 px-1.5 font-todak-mono text-[8px] font-black tracking-wide text-accent"
              color="danger"
              size="sm"
              variant="soft"
            >
              PR {pullRequests.length}
            </Chip>
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
    <button
      className="group grid min-h-8 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-left transition-colors hover:bg-surface-tertiary"
      onClick={() => onSelect(pullRequest)}
      type="button"
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
    </button>
  );
}
