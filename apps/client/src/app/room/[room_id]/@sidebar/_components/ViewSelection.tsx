'use client';
import { useSpaceStore } from '@/store/useSpaceStore';
import { Button } from '@heroui/react';

export default function ViewSelection() {
  const { currentView, setCurrentView } = useSpaceStore();

  return (
    <nav className="space-y-2.5">
      <p className="px-1 text-[11px] font-black tracking-tight text-muted">
        🧭 메인 뷰 전환
      </p>
      <Button
        className={`flex h-auto min-w-0 w-full items-center justify-start gap-3 rounded-2xl px-5 py-4 text-sm font-black shadow-surface transition-colors ${
          currentView === '2d'
            ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
            : 'border border-border bg-surface text-foreground hover:bg-surface-secondary'
        }`}
        variant="ghost"
        onClick={() => setCurrentView('2d')}
      >
        <span>🖥️</span>
        2D 가상 협업 타운
      </Button>
      <Button
        className={`flex h-auto min-w-0 w-full items-center justify-start gap-3 rounded-2xl px-5 py-4 text-sm font-black shadow-surface transition-colors ${
          currentView === 'meeting'
            ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
            : 'border border-border bg-surface text-foreground hover:bg-surface-secondary'
        }`}
        variant="ghost"
        onClick={() => setCurrentView('meeting')}
      >
        <span>📊</span>
        회의 보드
      </Button>
    </nav>
  );
}
