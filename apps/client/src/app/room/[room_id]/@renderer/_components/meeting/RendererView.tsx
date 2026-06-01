'use client';

import { useSpaceStore } from '@/store/useSpaceStore';
import PixiCanvas from '../2d/PixiCanvas';
import AnimalSwitcher from '../2d/AnimalSwitcher';
import MeetingBoard from './MeetingBoard';

interface RendererViewProps {
  roomId: string;
}

export default function RendererView({ roomId }: RendererViewProps) {
  const { currentView } = useSpaceStore();

  if (currentView === 'meeting') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MeetingBoard />
        {/* TODO: 회의 보드 컴포넌트 */}
      </div>
    );
  }

  return (
    <>
      <AnimalSwitcher />
      {/* 2D 가상 공간 */}
      <div className="renderer-stage-container flex-1 flex items-center justify-center p-4 relative">
        {/* 테두리와 배경 그림자, 그리고 투명 캔버스 뒤에 깔릴 가상 그리드 배경 주입 */}
        <div className="relative border-4 border-slate-300 rounded-2xl overflow-hidden shadow-2xl bg-surface todak-grid-bg">
          <PixiCanvas roomId={roomId} />
        </div>
      </div>
    </>
  );
}
