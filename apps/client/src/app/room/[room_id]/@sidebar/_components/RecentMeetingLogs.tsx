'use client';

import type { Minute, MinutesList } from '@/services/minutes/model';
import { useRecentMeetingMinutes } from '@/services/minutes/query';
import {
  type MinutesSocketEvent,
  useMinutesSocket,
} from '@/services/minutes/useMinutesSocket';
import { useSpaceStore } from '@/store/useSpaceStore';

import { Accordion, Button, Chip } from '@heroui/react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  meetingLogs: MinutesList;
}

export default function RecentMeetingLogs({ meetingLogs }: Props) {
  const { room_id: roomID } = useParams<{ room_id: string }>();

  const setCurrentMinutesId = useSpaceStore(state => state.setCurrentMinutesId);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);
  const [hasMeetingLogUpdate, setHasMeetingLogUpdate] = useState(false);
  const [isGenerationNoticeVisible, setIsGenerationNoticeVisible] =
    useState(false);
  const [generationNoticeMessage, setGenerationNoticeMessage] = useState(
    '회의록 생성되었습니다. 완료되면 알림으로 알려드릴게요',
  );
  const [generationNoticePosition, setGenerationNoticePosition] = useState({
    left: 278,
    top: 180,
  });
  const [isMeetingLogsExpanded, setIsMeetingLogsExpanded] = useState(false);
  const isMeetingLogsExpandedRef = useRef(isMeetingLogsExpanded);
  const meetingLogsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const generationNoticeTimeoutRef = useRef<number | null>(null);
  const generatingMinutesIdsRef = useRef<Set<string>>(new Set());
  const generationRefreshTimeoutsRef = useRef<number[]>([]);
  const isAwaitingGenerationRef = useRef(false);
  const minutesStatusSnapshotRef = useRef<Map<string, string>>(new Map());
  const {
    data: recentMeetingMinutes,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useRecentMeetingMinutes(roomID, {
    initialData: {
      minutes: meetingLogs.minutes,
      pagination: meetingLogs.pagination,
    },
  });
  const visibleMeetingLogs =
    recentMeetingMinutes?.pages.flatMap(page => page.minutes) ??
    meetingLogs.minutes;

  useEffect(() => {
    isMeetingLogsExpandedRef.current = isMeetingLogsExpanded;
  }, [isMeetingLogsExpanded]);

  const showGenerationNotice = useCallback((message: string) => {
    const triggerRect = meetingLogsTriggerRef.current?.getBoundingClientRect();

    if (triggerRect) {
      setGenerationNoticePosition({
        left: triggerRect.right + 18,
        top: triggerRect.top + triggerRect.height / 2,
      });
    }

    setGenerationNoticeMessage(message);
    setIsGenerationNoticeVisible(true);

    if (generationNoticeTimeoutRef.current !== null) {
      window.clearTimeout(generationNoticeTimeoutRef.current);
    }

    generationNoticeTimeoutRef.current = window.setTimeout(() => {
      setIsGenerationNoticeVisible(false);
      generationNoticeTimeoutRef.current = null;
    }, 5000);
  }, []);

  const scheduleGenerationRefreshes = useCallback(() => {
    generationRefreshTimeoutsRef.current.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });

    void refetch();

    generationRefreshTimeoutsRef.current = [500, 1500, 3500, 7000].map(delay =>
      window.setTimeout(() => {
        void refetch();
      }, delay),
    );
  }, [refetch]);

  useEffect(() => {
    const unsubscribe = useSpaceStore.subscribe(
      state => state.minutesGenerationNoticeSeq,
      minutesGenerationNoticeSeq => {
        if (minutesGenerationNoticeSeq === 0) {
          return;
        }

        showGenerationNotice(
          '회의록 생성되었습니다. 완료되면 알림으로 알려드릴게요',
        );
        isAwaitingGenerationRef.current = true;
        scheduleGenerationRefreshes();
      },
    );

    return () => {
      unsubscribe();

      if (generationNoticeTimeoutRef.current !== null) {
        window.clearTimeout(generationNoticeTimeoutRef.current);
      }

      generationRefreshTimeoutsRef.current.forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
    };
  }, [scheduleGenerationRefreshes, showGenerationNotice]);

  const handleMinutesUpdated = useCallback(() => {
    void refetch();

    if (!isMeetingLogsExpandedRef.current) {
      setHasMeetingLogUpdate(true);
    }
  }, [refetch]);

  const handleMinutesEvent = useCallback(
    (eventName: MinutesSocketEvent) => {
      if (
        eventName === 'minutes:created' ||
        eventName === 'minutes:generation-started'
      ) {
        isAwaitingGenerationRef.current = true;
        scheduleGenerationRefreshes();
      }

      if (eventName === 'minutes:generated') {
        void refetch();
        showGenerationNotice('회의록 생성이 완료되었습니다');
        isAwaitingGenerationRef.current = false;
      }
    },
    [refetch, scheduleGenerationRefreshes, showGenerationNotice],
  );

  useMinutesSocket({
    roomId: roomID,
    onEvent: handleMinutesEvent,
    onUpdated: handleMinutesUpdated,
  });

  const handleClick = (minutesId: string) => {
    setCurrentMinutesId(minutesId);
    setCurrentView('meeting');
  };

  const handleMeetingLogsTriggerPress = () => {
    setIsMeetingLogsExpanded(current => {
      const next = !current;

      if (next) {
        setHasMeetingLogUpdate(false);
      }

      return next;
    });
  };

  const hasMeetingLogs = visibleMeetingLogs.length > 0;
  const hasGeneratingMeetingLog = visibleMeetingLogs.some(log =>
    isGeneratingStatus(log.status),
  );

  useEffect(() => {
    let hasCompletedGeneration = false;

    visibleMeetingLogs.forEach(log => {
      const previousStatus = minutesStatusSnapshotRef.current.get(log.id);

      if (isGeneratingStatus(log.status)) {
        generatingMinutesIdsRef.current.add(log.id);
        isAwaitingGenerationRef.current = true;
        minutesStatusSnapshotRef.current.set(log.id, log.status);
        return;
      }

      if (
        log.status === 'draft' &&
        (generatingMinutesIdsRef.current.has(log.id) ||
          isGeneratingStatus(previousStatus ?? '') ||
          (isAwaitingGenerationRef.current && previousStatus === undefined))
      ) {
        generatingMinutesIdsRef.current.delete(log.id);
        hasCompletedGeneration = true;
      }

      minutesStatusSnapshotRef.current.set(log.id, log.status);
    });

    if (hasCompletedGeneration) {
      isAwaitingGenerationRef.current = false;
      showGenerationNotice('회의록 생성이 완료되었습니다');
    }
  }, [showGenerationNotice, visibleMeetingLogs]);

  useEffect(() => {
    if (!hasGeneratingMeetingLog) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasGeneratingMeetingLog, refetch]);

  const generationNotice =
    isGenerationNoticeVisible && typeof document !== 'undefined'
      ? createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed z-[70] w-56 -translate-y-1/2 rounded-lg border border-accent bg-accent px-3 py-2 text-[10px] font-black leading-snug text-white shadow-[0_10px_30px_rgba(255,111,97,0.28)]"
            role="status"
            style={{
              left: generationNoticePosition.left,
              top: generationNoticePosition.top,
            }}
          >
            {generationNoticeMessage}
            <span
              aria-hidden
              className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 border-b border-l border-accent bg-accent"
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Accordion.Item id="recent-meetings">
        <Accordion.Heading>
          <Accordion.Trigger
            className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left"
            ref={meetingLogsTriggerRef}
            onPress={handleMeetingLogsTriggerPress}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[11px] font-black tracking-tight text-muted">
                최근 회의록
              </span>
              {hasMeetingLogUpdate && (
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
        <Accordion.Panel className="pb-3">
          <div className="max-h-[25rem] min-h-0 space-y-2 overflow-y-auto pr-1">
            {!hasMeetingLogs ? (
              <div className="flex min-h-14 items-center justify-center rounded-lg bg-surface-secondary px-3 text-center">
                <p className="text-[10px] font-black text-muted">
                  최근 회의록이 없습니다.
                </p>
              </div>
            ) : (
              visibleMeetingLogs.map(log => (
                <MeetingLogItem
                  key={log.id}
                  log={log}
                  onSelect={() => handleClick(log.id)}
                />
              ))
            )}
            {hasNextPage && (
              <Button
                className="h-8 w-full rounded-lg bg-background/70 text-[10px] font-black text-muted shadow-none hover:bg-surface-tertiary hover:text-foreground"
                isDisabled={isFetchingNextPage}
                variant="ghost"
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? '불러오는 중...' : '더보기'}
              </Button>
            )}
          </div>
        </Accordion.Panel>
      </Accordion.Item>
      {generationNotice}
    </>
  );
}

function MeetingLogItem({
  log,
  onSelect,
}: {
  log: Minute;
  onSelect: () => void;
}) {
  const visibleIssueNumbers = log.linked_issue_numbers.slice(0, 3);
  const hiddenIssueCount = Math.max(log.linked_issue_numbers.length - 3, 0);
  const statusMeta = getMinutesStatusMeta(log.status);
  const isGenerating = isGeneratingStatus(log.status);

  return (
    <Button
      className={`group h-auto min-w-0 w-full rounded-lg border px-2.5 py-2.5 text-left shadow-none transition-colors ${
        isGenerating
          ? 'cursor-wait border-accent/25 bg-accent/5 opacity-90'
          : 'border-border/60 bg-surface-secondary hover:border-accent/30 hover:bg-surface-tertiary'
      }`}
      isDisabled={isGenerating}
      variant="ghost"
      onClick={onSelect}
    >
      <span className="flex min-w-0 w-full flex-col gap-2">
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-xs font-black text-foreground">
              {log.title}
            </span>
          </span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 font-todak-mono text-[8px] font-black uppercase ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-1">
          {isGenerating && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-black text-accent">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              회의록 생성 중
            </span>
          )}
          {visibleIssueNumbers.length > 0 ? (
            <>
              <span className="text-[9px] font-black text-muted">
                생성 이슈
              </span>
              {visibleIssueNumbers.map(issueNumber => (
                <span
                  className="rounded-md bg-accent/10 px-1.5 py-0.5 font-todak-mono text-[9px] font-black text-accent"
                  key={`${log.id}-issue-${issueNumber}`}
                >
                  #{issueNumber}
                </span>
              ))}
              {hiddenIssueCount > 0 && (
                <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                  +{hiddenIssueCount}
                </span>
              )}
            </>
          ) : (
            <span className="text-[9px] font-bold text-muted">
              생성된 이슈 없음
            </span>
          )}
        </span>
      </span>
    </Button>
  );
}

function isGeneratingStatus(status: string) {
  return status === 'generate' || status === 'generating';
}

function getMinutesStatusMeta(status: string) {
  if (isGeneratingStatus(status)) {
    return {
      label: status.toLocaleUpperCase(),
      className: 'bg-accent/10 text-accent',
    };
  }

  if (status === 'confirmed') {
    return {
      label: status.toLocaleUpperCase(),
      className: 'bg-emerald-500/15 text-emerald-600',
    };
  }

  if (status === 'draft') {
    return {
      label: status.toLocaleUpperCase(),
      className: 'bg-slate-500/15 text-slate-500',
    };
  }

  return {
    label: status,
    className: 'bg-background/70 text-muted',
  };
}
