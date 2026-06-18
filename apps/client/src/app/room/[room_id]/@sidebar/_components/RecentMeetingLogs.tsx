'use client';

import type { Minute, MinutesList } from '@/services/minutes/model';
import { useRecentMeetingMinutes } from '@/services/minutes/query';
import { useMinutesSocketSync } from '@/services/minutes/useMinutesSocketSync';
import { useSpaceStore } from '@/store/useSpaceStore';

import { Accordion, Button, Chip } from '@heroui/react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Props {
  meetingLogs: MinutesList;
}

export default function RecentMeetingLogs({ meetingLogs }: Props) {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  useMinutesSocketSync(roomID);

  const setCurrentMinutesId = useSpaceStore(state => state.setCurrentMinutesId);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);
  const meetingMinutesUpdateSeq = useSpaceStore(
    state => state.meetingMinutesUpdateSeq,
  );
  const [hasMeetingLogUpdate, setHasMeetingLogUpdate] = useState(false);
  const [isMeetingLogsExpanded, setIsMeetingLogsExpanded] = useState(false);
  const isMeetingLogsExpandedRef = useRef(isMeetingLogsExpanded);
  const {
    data: recentMeetingMinutes,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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

  useEffect(() => {
    if (meetingMinutesUpdateSeq === 0) {
      return;
    }

    if (!isMeetingLogsExpandedRef.current) {
      setHasMeetingLogUpdate(true);
    }
  }, [meetingMinutesUpdateSeq]);

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

  return (
    <Accordion.Item id="recent-meetings">
      <Accordion.Heading>
        <Accordion.Trigger
          className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left"
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
