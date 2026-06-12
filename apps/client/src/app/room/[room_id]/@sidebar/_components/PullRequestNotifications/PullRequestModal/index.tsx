'use client';

import { cn } from '@/lib/cn';
import { getStoredAuthUser } from '@/lib/auth';
import { isSystemError, isTodakApiError } from '@/services/error';
import {
  useApprovePullRequest,
  useMergePullRequest,
  useRoomPullRequestDetail,
} from '@/services/github/query';
import { Button, Chip, Modal } from '@heroui/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import type { PullRequestModalData } from './types';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false },
);

interface PullRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pullRequest: PullRequestModalData;
  roomID: string;
}

export default function PullRequestModal({
  isOpen,
  onOpenChange,
  pullRequest,
  roomID,
}: PullRequestModalProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hasApproved, setHasApproved] = useState(false);
  const [hasMerged, setHasMerged] = useState(false);
  const {
    data: detail,
    isError,
    isPending,
  } = useRoomPullRequestDetail(roomID, pullRequest.id, {
    enabled: isOpen,
  });
  const approvePullRequest = useApprovePullRequest();
  const mergePullRequest = useMergePullRequest();
  const currentGithubUsername = getStoredAuthUser()?.login ?? '';

  if (typeof document === 'undefined') {
    return null;
  }

  const isActionPending =
    approvePullRequest.isPending || mergePullRequest.isPending;
  const isDraft = detail?.is_draft ?? pullRequest.isDraft;
  const isMerged = hasMerged || (detail?.is_merged ?? pullRequest.isMerged);
  const status = getStatusMeta(
    detail?.state ?? pullRequest.state,
    isDraft,
    isMerged,
  );
  const title = detail?.title ?? pullRequest.title;
  const author = detail?.author?.github_username ?? pullRequest.author;
  const assignees =
    detail?.assignees.map(assignee => assignee.github_username) ??
    pullRequest.assignees;
  const isMyPullRequest = isUserPullRequestOwner({
    assignees,
    author,
    currentGithubUsername,
  });
  const canReview =
    !isMyPullRequest &&
    !isActionPending &&
    !isPending &&
    !isError &&
    !hasApproved &&
    !isDraft &&
    !isMerged;
  const canMerge =
    isMyPullRequest &&
    !isActionPending &&
    !isPending &&
    !isError &&
    !isDraft &&
    !isMerged &&
    detail?.mergeable !== false;
  const labels = detail?.labels ?? pullRequest.labels;
  const branch = detail?.branch ?? pullRequest.branch;
  const createdAt = detail?.created_at ? formatDateTime(detail.created_at) : '';
  const updatedAt = detail?.updated_at
    ? formatDateTime(detail.updated_at)
    : pullRequest.updatedAt;
  const body = detail?.body?.trim();
  const pullRequestUrl = detail?.html_url ?? pullRequest.url;
  const diffLabel = detail?.changes
    ? `+${detail.changes.additions}/-${detail.changes.deletions}`
    : '확인 중';

  const handleApprove = () => {
    if (!canReview) {
      return;
    }

    setActionMessage(null);
    approvePullRequest.mutate(
      {
        pullNumber: pullRequest.id,
        roomId: roomID,
      },
      {
        onError: error => setActionMessage(getActionErrorMessage(error)),
        onSuccess: () => {
          setHasApproved(true);
          setActionMessage('PR 리뷰 승인이 완료되었습니다.');
        },
      },
    );
  };

  const handleMerge = () => {
    if (!canMerge) {
      return;
    }

    setActionMessage(null);
    mergePullRequest.mutate(
      {
        merge_method: 'squash',
        pullNumber: pullRequest.id,
        roomId: roomID,
      },
      {
        onError: error => setActionMessage(getActionErrorMessage(error)),
        onSuccess: () => {
          setHasMerged(true);
          setActionMessage('PR 머지가 완료되었습니다.');
        },
      },
    );
  };

  const modal = (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="flex max-h-[92vh] w-[calc(100vw-32px)] max-w-[1040px] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-surface shadow-todak-panel">
          <Modal.Header className="flex items-start justify-between gap-5 border-b border-border px-5 py-5 sm:px-7">
            <div className="min-w-0 space-y-3">
              <p className="text-[12px] font-bold text-muted">
                GitHub Pull Request
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Modal.Heading className="min-w-0 text-[22px] font-black leading-tight text-foreground">
                  {title}
                </Modal.Heading>

                <a
                  className="font-todak-mono text-[18px] font-bold text-todak-coral-500 underline decoration-todak-coral-300 underline-offset-4 transition-colors hover:text-todak-coral-600 focus:outline-none focus:ring-2 focus:ring-todak-coral-300"
                  href={pullRequestUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  #{pullRequest.id}
                </a>
              </div>
              <p className="text-[11px] font-bold text-muted">
                생성 {createdAt || '확인 중'} · 수정 {updatedAt || '확인 중'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-muted">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold',
                    status.className,
                  )}
                >
                  {status.label}
                </span>
                <span>
                  <strong className="font-semibold text-foreground">
                    {author}
                  </strong>{' '}
                  wants to merge into <BranchName>{branch.base}</BranchName>{' '}
                  from <BranchName>{branch.head}</BranchName>
                </span>
              </div>
            </div>

            <Modal.CloseTrigger />
          </Modal.Header>

          <Modal.Body className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
              <main className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3 text-[12px] font-semibold text-muted">
                  <span>
                    Commits{' '}
                    <strong className="text-foreground">
                      {detail?.changes.commits ?? '-'}
                    </strong>
                  </span>
                  <span>
                    Files changed{' '}
                    <strong className="text-foreground">
                      {detail?.changes.changed_files ?? '-'}
                    </strong>
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {diffLabel}
                  </span>
                </div>

                <section className="overflow-hidden rounded-xl border border-border bg-white">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary px-4 py-3">
                    <p className="text-[12px] font-bold text-foreground">
                      {author} commented
                    </p>
                  </header>
                  <div className="max-h-[360px] overflow-y-auto px-4 py-4">
                    {body ? (
                      <div data-color-mode="light">
                        <MarkdownPreview
                          className="bg-transparent text-[13px] font-normal leading-7 text-slate-600"
                          source={body}
                        />
                      </div>
                    ) : (
                      <p className="text-[13px] font-medium leading-7 text-muted">
                        등록된 PR 본문이 없습니다.
                      </p>
                    )}
                  </div>
                </section>

                {isPending && (
                  <section className="rounded-xl border border-border bg-surface-secondary px-4 py-3">
                    <p className="mt-1 text-[11px] font-bold text-muted">
                      상세 정보를 불러오는 중입니다...
                    </p>
                  </section>
                )}
                {actionMessage !== null && (
                  <section className="rounded-xl border border-border bg-surface-secondary px-4 py-3">
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[12px] font-black text-todak-coral-500 shadow-sm">
                      {actionMessage}
                    </p>
                  </section>
                )}
              </main>

              <aside className="space-y-4 text-[12px] font-bold text-muted">
                <SidebarMeta title="Review">
                  <p className="font-semibold text-foreground">
                    {getReviewStatus({
                      hasApproved,
                      isDraft,
                      isMerged,
                      isMyPullRequest,
                    })}
                  </p>
                </SidebarMeta>
                <SidebarMeta title="Assignees">
                  <InlineList
                    emptyText="No assignees"
                    items={assignees.map(assignee => `@${assignee}`)}
                  />
                </SidebarMeta>
                <SidebarMeta title="Labels">
                  <LabelChips labels={labels} />
                </SidebarMeta>
                <SidebarMeta title="Branches">
                  <p className="break-words font-semibold leading-relaxed text-foreground">
                    {branch.head}
                  </p>
                  <p className="mt-1 break-words font-medium leading-relaxed text-muted">
                    into {branch.base}
                  </p>
                </SidebarMeta>
                <SidebarActions
                  canApprove={canReview}
                  canMerge={canMerge}
                  hasApproved={hasApproved}
                  isMerged={isMerged}
                  isApproving={approvePullRequest.isPending}
                  isMyPullRequest={isMyPullRequest}
                  isMerging={mergePullRequest.isPending}
                  onApprove={handleApprove}
                  onMerge={handleMerge}
                />
              </aside>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );

  return createPortal(modal, document.body);
}

function BranchName({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
      {children}
    </span>
  );
}

function SidebarMeta({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-b border-border pb-4 last:border-b-0">
      <h3 className="mb-2 text-[11px] font-bold text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function InlineList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: string[];
}) {
  return (
    <p className="break-words font-semibold leading-relaxed text-foreground">
      {items.length > 0 ? items.join(', ') : emptyText}
    </p>
  );
}

function LabelChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return (
      <p className="break-words font-medium leading-relaxed text-muted">
        None yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(label => (
        <Chip
          className="h-6 max-w-full rounded-md bg-surface-secondary px-2 text-[11px] font-semibold text-foreground"
          key={label}
          size="sm"
          variant="soft"
        >
          <span className="block max-w-[160px] truncate">{label}</span>
        </Chip>
      ))}
    </div>
  );
}

function SidebarActions({
  canApprove,
  canMerge,
  hasApproved,
  isMerged,
  isApproving,
  isMyPullRequest,
  isMerging,
  onApprove,
  onMerge,
}: {
  canApprove: boolean;
  canMerge: boolean;
  hasApproved: boolean;
  isMerged: boolean;
  isApproving: boolean;
  isMyPullRequest: boolean;
  isMerging: boolean;
  onApprove: () => void;
  onMerge: () => void;
}) {
  if (isMyPullRequest) {
    return (
      <section className="space-y-2 pt-1">
        <Button
          className="h-10 w-full rounded-lg bg-todak-coral-500 text-[12px] font-bold text-white shadow-sm hover:bg-todak-coral-600 disabled:opacity-50"
          isDisabled={!canMerge}
          onPress={onMerge}
          type="button"
        >
          {isMerging ? '머지 중...' : isMerged ? '머지 완료' : 'PR 머지하기'}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-2 pt-1">
      <Button
        className="h-10 w-full rounded-lg border border-border bg-white text-[12px] font-bold text-foreground shadow-sm hover:bg-surface-secondary disabled:opacity-50"
        isDisabled={!canApprove}
        onPress={onApprove}
        type="button"
        variant="ghost"
      >
        {isApproving
          ? '승인 중...'
          : hasApproved
            ? '승인 완료'
            : '리뷰 승인하기'}
      </Button>
    </section>
  );
}

function isUserPullRequestOwner({
  assignees,
  author,
  currentGithubUsername,
}: {
  assignees: string[];
  author: string;
  currentGithubUsername: string;
}) {
  const normalizedCurrentUser = currentGithubUsername.trim().toLowerCase();

  if (normalizedCurrentUser === '') {
    return false;
  }

  if (author.trim().toLowerCase() === normalizedCurrentUser) {
    return true;
  }

  return assignees.some(
    assignee => assignee.trim().toLowerCase() === normalizedCurrentUser,
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getReviewStatus({
  hasApproved,
  isDraft,
  isMerged,
  isMyPullRequest,
}: {
  hasApproved: boolean;
  isDraft: boolean;
  isMerged: boolean;
  isMyPullRequest: boolean;
}) {
  if (isMerged) {
    return '머지됨';
  }

  if (isDraft) {
    return 'Draft';
  }

  if (isMyPullRequest || hasApproved) {
    return '승인됨';
  }

  return '승인 필요';
}

function getActionErrorMessage(error: unknown) {
  if (isTodakApiError(error)) {
    return error.response.data.error;
  }

  if (isSystemError(error)) {
    return error.message;
  }

  return 'PR 작업 처리 중 오류가 발생했습니다.';
}

function getStatusMeta(state: string, isDraft: boolean, isMerged: boolean) {
  if (isDraft) {
    return {
      className: 'bg-slate-100 text-slate-500',
      label: 'DRAFT',
    };
  }

  if (isMerged) {
    return {
      className: 'bg-purple-50 text-purple-600',
      label: 'MERGED',
    };
  }

  if (state === 'open') {
    return {
      className: 'bg-emerald-50 text-emerald-600',
      label: 'OPEN',
    };
  }

  if (state === 'closed') {
    return {
      className: 'bg-rose-50 text-rose-600',
      label: 'CLOSED',
    };
  }

  return {
    className: 'bg-slate-100 text-slate-500',
    label: state.toUpperCase(),
  };
}

export type { PullRequestModalData };
