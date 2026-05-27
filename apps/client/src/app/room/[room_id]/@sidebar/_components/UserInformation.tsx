'use client';
export default function UserInformation() {
  return (
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
  );
}
