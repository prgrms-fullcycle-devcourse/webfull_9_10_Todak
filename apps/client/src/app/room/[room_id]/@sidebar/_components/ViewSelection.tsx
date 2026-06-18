'use client';
import { useRoomUiStore } from '@/store/useRoomUiStore';
import { Button } from '@heroui/react';

export default function ViewSelection() {
  const currentView = useRoomUiStore(state => state.currentView);
  const setCurrentView = useRoomUiStore(state => state.setCurrentView);

  return (
    <section className="shrink-0 space-y-1.5">
      <p className="px-1 text-[11px] font-black tracking-tight text-muted">
        메인 뷰 전환
      </p>
      <Button
        className={`h-9 min-w-0 w-full justify-start rounded-lg px-3 text-xs font-black shadow-none transition-colors ${
          currentView === '2d'
            ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
            : 'border border-border bg-surface text-foreground hover:bg-surface-secondary'
        }`}
        variant="ghost"
        onClick={() => setCurrentView('2d')}
      >
        <span className="truncate">2D 가상 협업 타운</span>
      </Button>
      <Button
        className={`h-9 min-w-0 w-full justify-start rounded-lg px-3 text-xs font-black shadow-none transition-colors ${
          currentView === 'meeting'
            ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
            : 'border border-border bg-surface text-foreground hover:bg-surface-secondary'
        }`}
        variant="ghost"
        onClick={() => setCurrentView('meeting')}
      >
        <span className="truncate">회의 보드</span>
      </Button>
    </section>
  );
}
