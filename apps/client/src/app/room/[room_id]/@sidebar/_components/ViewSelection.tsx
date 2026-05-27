'use client';
import { Button } from '@heroui/react';

export default function ViewSelection() {
  return (
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
  );
}
