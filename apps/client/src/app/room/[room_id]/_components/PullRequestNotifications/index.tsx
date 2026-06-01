'use client';

import { cn } from '@/lib/cn';
import { Card, Chip } from '@heroui/react';

const TEMP_PULL_REQUESTS = [
  {
    id: 142,
    title: '채팅 이모지 반응 UI 수정',
    updatedAt: '10분 전',
  },
  {
    id: 138,
    title: '웹소켓 자동 재연결 로직 개선',
    updatedAt: '1시간 전',
  },
  {
    id: 135,
    title: '메인 대시보드 마일스톤 위젯 추가',
    updatedAt: '3시간 전',
  },
  {
    id: 129,
    title: '회의실 입장 상태 동기화 패치',
    updatedAt: '어제',
  },
  {
    id: 124,
    title: '투두 카드 담당자 라벨 정렬',
    updatedAt: '2일 전',
  },
] as const;

interface PullRequestNotification {
  id: number;
  title: string;
  updatedAt: string;
}

interface PullRequestNotificationsProps {
  className?: string;
  pullRequests?: readonly PullRequestNotification[];
}

export default function PullRequestNotifications({
  className,
  pullRequests = TEMP_PULL_REQUESTS,
}: PullRequestNotificationsProps) {
  return (
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
        {pullRequests.map(pullRequest => (
          <PullRequestItem
            key={`pull-request-notification-${pullRequest.id}`}
            pullRequest={pullRequest}
          />
        ))}
      </Card.Content>
    </Card>
  );
}

function PullRequestItem({
  pullRequest,
}: {
  pullRequest: PullRequestNotification;
}) {
  return (
    <article className="group grid min-h-9 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-700/90 bg-slate-800/70 px-2.5 py-2 shadow-sm transition-colors hover:border-todak-coral-300/50 hover:bg-slate-800">
      <span className="font-todak-mono text-[11px] font-black text-todak-coral-500">
        #{pullRequest.id}
      </span>
      <h3 className="truncate text-[10px] font-black text-slate-100">
        {pullRequest.title}
      </h3>
      <time className="font-todak-mono text-[9px] font-black text-slate-400">
        {pullRequest.updatedAt}
      </time>
    </article>
  );
}
