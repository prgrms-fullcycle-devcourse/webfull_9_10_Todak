'use client';
import { Button } from '@heroui/react';

const archiveItems = [
  {
    date: '2026. 05. 15.',
    room: '회의실 A',
    title: '소켓 연결 및 기본 채널링 논의',
  },
  {
    date: '2026. 05. 14.',
    room: '회의실 A',
    title: 'UI/UX 피그마 검토 및 스타일 조율',
  },
  {
    date: '2026. 05. 12.',
    room: '회의실 B',
    title: '백엔드 모노레포 구조 이식 전략',
  },
];

export default function RecentMeetingLogs() {
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2">
      <p className="px-1 text-[11px] font-black tracking-tight text-muted">
        📁 최근 회의록 아카이브 (최근 5개)
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {archiveItems.map(item => (
          <Button
            className="h-auto min-w-0 w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-surface transition-colors hover:bg-surface-secondary"
            key={`${item.date}-${item.title}`}
            variant="ghost"
          >
            <span className="block min-w-0">
              <span className="block truncate text-sm font-black text-foreground">
                {item.title}
              </span>
              <span className="mt-1 block font-todak-mono text-[9px] text-muted">
                {item.date} · {item.room}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
