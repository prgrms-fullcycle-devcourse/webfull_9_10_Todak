'use client';

import type { Minute } from '@/services/minutes/model';
import { useSpaceStore } from '@/store/useSpaceStore';

import { Accordion, Button } from '@heroui/react';

interface Props {
  meetingLogs: Minute[];
}

export default function RecentMeetingLogs({ meetingLogs }: Props) {
  const setCurrentMinutesId = useSpaceStore(state => state.setCurrentMinutesId);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);

  const handleClick = (minutesId: string) => {
    setCurrentMinutesId(minutesId);
    setCurrentView('meeting');
  };

  const hasMeetingLogs = meetingLogs.length > 0;

  return (
    <Accordion.Item id="recent-meetings">
      <Accordion.Heading>
        <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left">
          <span className="text-[11px] font-black tracking-tight text-muted">
            최근 회의록
          </span>
          <Accordion.Indicator className="size-3.5 text-muted" />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel className="pb-3">
        <div className="max-h-44 min-h-0 space-y-1.5 overflow-y-auto pr-1">
          {!hasMeetingLogs ? (
            <div className="flex min-h-14 items-center justify-center rounded-lg bg-surface-secondary px-3 text-center">
              <p className="text-[10px] font-black text-muted">
                최근 회의록이 없습니다.
              </p>
            </div>
          ) : (
            meetingLogs.map(log => (
              <Button
                className="h-auto min-w-0 w-full rounded-lg bg-surface-secondary px-2.5 py-2 text-left shadow-none transition-colors hover:bg-surface-tertiary"
                key={log.id}
                variant="ghost"
                onClick={() => handleClick(log.id)}
              >
                <span className="block min-w-0">
                  <span className="block truncate text-xs font-black text-foreground">
                    {log.title}
                  </span>
                  <span className="mt-0.5 block font-todak-mono text-[8px] text-muted">
                    {log.created_at} · {log.type}
                  </span>
                </span>
              </Button>
            ))
          )}
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
