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

export default function Sidebar() {
  return (
    <>
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-surface">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-secondary text-3xl">
            🐼
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-foreground">
              수정
              <span className="ml-1 font-todak-mono text-[9px] text-accent">
                [Frontend]
              </span>
            </p>
            <p className="truncate font-todak-mono text-[9px] text-muted">
              repo: team/todak-with-me
            </p>
          </div>
        </div>
      </div>

      <nav className="space-y-2.5">
        <p className="px-1 text-[11px] font-black tracking-tight text-muted">
          🧭 메인 뷰 전환
        </p>
        <Button
          className="flex h-auto min-w-0 w-full items-center justify-start gap-3 rounded-2xl bg-accent px-5 py-4 text-sm font-black text-accent-foreground shadow-surface transition-colors hover:bg-accent-hover"
          variant="ghost"
        >
          <span>🖥️</span>
          2D 가상 협업 타운
        </Button>
        <Button
          className="flex h-auto min-w-0 w-full items-center justify-start gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm font-black text-foreground shadow-surface transition-colors hover:bg-surface-secondary"
          variant="ghost"
        >
          <span>📊</span>
          3-in-1 미팅 보드
        </Button>
      </nav>

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

      <div className="mt-4 rounded-2xl border border-accent-soft bg-accent-soft/70 p-4">
        <p className="text-sm font-black text-accent">🦉 AI 가이드</p>
        <p className="mt-2 text-xs leading-6 text-foreground">
          캐릭터를 클릭하면 팀원의 To-Do와 내 프로필 수정을 한 곳에서 진행할 수
          있어요!
        </p>
      </div>
    </>
  );
}
