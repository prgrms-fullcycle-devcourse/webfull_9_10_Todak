'use client';

import type { Minute } from '@/sevice/minutes/model';

import { Button } from '@heroui/react';

interface Props {
  meetingLogs: Minute[];
}

export default function RecentMeetingLogs({ meetingLogs }: Props) {
  const hasMeetingLogs = meetingLogs.length > 0;

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2">
      <p className="px-1 text-[11px] font-black tracking-tight text-muted">
        📁 최근 회의록 아카이브 (최근 5개)
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {!hasMeetingLogs ? (
          <div className="flex min-h-[92px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-4 text-center shadow-surface">
            <p className="text-[11px] font-black text-muted">
              최근 회의록이 없습니다.
            </p>
          </div>
        ) : (
          meetingLogs.map(log => (
            <Button
              className="h-auto min-w-0 w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-surface transition-colors hover:bg-surface-secondary"
              key={`${log.id}-${log.title}`}
              variant="ghost"
            >
              <span className="block min-w-0">
                <span className="block truncate text-sm font-black text-foreground">
                  {log.title}
                </span>
                <span className="mt-1 block font-todak-mono text-[9px] text-muted">
                  {log.created_at} · {log.type}
                </span>
              </span>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
