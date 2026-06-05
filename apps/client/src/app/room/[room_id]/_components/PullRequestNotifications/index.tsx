'use client';

import { cn } from '@/lib/cn';
import { Card, Chip } from '@heroui/react';
import { useState } from 'react';

import PullRequestModal, {
  type PullRequestModalData,
} from './PullRequestModal';

interface PullRequestNotificationsProps {
  className?: string;
  pullRequests?: readonly PullRequestModalData[];
}

export default function PullRequestNotifications({
  className,
  pullRequests = [],
}: PullRequestNotificationsProps) {
  const [selectedPullRequest, setSelectedPullRequest] =
    useState<PullRequestModalData | null>(null);
  const isModalOpen = selectedPullRequest !== null;

  return (
    <>
      <Card
        className={cn(
          'review-station-card w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-slate-700/80 bg-slate-900/95 p-0 text-slate-100 shadow-todak-panel backdrop-blur-md',
          className,
        )}
      >
        <Card.Header className="flex-row items-center justify-between gap-2 px-3.5 pb-2 pt-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded bg-slate-100 text-xs shadow-sm"
            >
              📋
            </span>
            <Card.Title className="truncate text-[12px] font-black tracking-normal text-slate-100">
              Review Station (PR)
            </Card.Title>
          </div>

          <Chip
            className="h-6 shrink-0 rounded-md bg-todak-coral-500/15 px-2 font-todak-mono text-[8px] font-black tracking-wide text-todak-coral-300"
            color="danger"
            size="sm"
            variant="soft"
          >
            Webhook Sync
          </Chip>
        </Card.Header>

        <Card.Content className="max-h-[116px] gap-1.5 overflow-y-auto px-3.5 pb-3.5 pt-0 pr-2">
          {pullRequests.length > 0 ? (
            pullRequests.map(pullRequest => (
              <PullRequestItem
                key={`pull-request-notification-${pullRequest.id}`}
                onSelect={setSelectedPullRequest}
                pullRequest={pullRequest}
              />
            ))
          ) : (
            <p className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2.5 py-2 text-[10px] font-bold text-slate-400">
              표시할 PR이 없습니다.
            </p>
          )}
        </Card.Content>
      </Card>

      <PullRequestModal
        isOpen={isModalOpen}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setSelectedPullRequest(null);
          }
        }}
        pullRequest={selectedPullRequest}
      />
    </>
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
      className="group grid min-h-9 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-700/90 bg-slate-800/70 px-2.5 py-2 text-left shadow-sm transition-colors hover:border-todak-coral-300/50 hover:bg-slate-800"
      onClick={() => onSelect(pullRequest)}
      type="button"
    >
      <span className="font-todak-mono text-[11px] font-black text-todak-coral-500">
        #{pullRequest.id}
      </span>
      <h3 className="truncate text-[10px] font-black text-slate-100">
        {pullRequest.title}
      </h3>
      <time className="font-todak-mono text-[9px] font-black text-slate-400">
        {pullRequest.updatedAt}
      </time>
    </button>
  );
}
