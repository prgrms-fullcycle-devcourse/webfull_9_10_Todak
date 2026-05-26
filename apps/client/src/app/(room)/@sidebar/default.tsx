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
      <div className="mb-5 rounded-xl border border-border bg-surface p-3 shadow-surface">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-accent bg-accent-soft text-sm font-black text-accent-soft-foreground">
            N
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-foreground">
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

      <nav className="space-y-2">
        <p className="px-1 text-[10px] font-black uppercase tracking-wider text-muted">
          Main View
        </p>
        <button
          className="flex w-full items-center justify-start rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-accent-foreground shadow-surface transition-colors hover:bg-accent-hover"
          type="button"
        >
          2D 가상 협업 타운
        </button>
        <button
          className="flex w-full items-center justify-start rounded-xl bg-default px-4 py-2.5 text-xs font-black text-default-foreground shadow-surface transition-colors hover:bg-default-hover"
          type="button"
        >
          3-in-1 미팅 보드
        </button>
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2">
        <p className="px-1 text-[10px] font-black uppercase tracking-wider text-muted">
          Recent Meetings
        </p>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {archiveItems.map(item => (
            <button
              className="w-full rounded-xl border border-border bg-surface p-3 text-left shadow-surface transition-colors hover:bg-surface-secondary"
              key={`${item.date}-${item.title}`}
              type="button"
            >
              <span className="block truncate text-xs font-black text-foreground">
                {item.title}
              </span>
              <span className="mt-1 block font-todak-mono text-[9px] text-muted">
                {item.date} · {item.room}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-accent-soft bg-accent-soft p-3">
        <p className="text-xs font-black text-accent-soft-foreground">
          AI 가이드
        </p>
        <p className="mt-1 text-[10px] leading-4 text-foreground">
          캐릭터를 클릭하면 팀원의 To-Do와 프로필 정보를 확인할 수 있어요.
        </p>
      </div>
    </>
  );
}
