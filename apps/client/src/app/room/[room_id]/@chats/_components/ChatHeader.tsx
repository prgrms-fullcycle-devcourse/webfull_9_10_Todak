'use client';

import ChatCloseButton from './ChatCloseButton';
import { TabType } from '../_types';

interface ChatHeaderProps {
  meetingStatus: 'ongoing' | 'ended' | 'cancelled';
  tab: TabType;
}

export default function ChatHeader({ meetingStatus, tab }: ChatHeaderProps) {
  const title = tab === 'all' ? '전체 채팅' : '회의실 B';
  const icon = tab === 'all' ? '🌐' : '🔒';

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <p className="text-sm font-black text-foreground">{title}</p>
        <span
          className={`rounded-full ml-21 px-2 py-0.5 text-[10px] font-bold ${
            meetingStatus === 'ongoing'
              ? 'bg-red-100 text-red-500'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {meetingStatus === 'ongoing' ? '🔴 회의 진행 중' : '회의 대기 중'}
        </span>
      </div>
      <ChatCloseButton />
    </div>
  );
}
