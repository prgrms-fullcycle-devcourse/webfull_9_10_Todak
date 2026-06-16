'use client';

import ChatCloseButton from './ChatCloseButton';
import { TabType } from '../_types';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useSpaceStore } from '@/store/useSpaceStore';

interface ChatHeaderProps {
  meetingStatus: 'ongoing' | 'ended' | 'cancelled';
  tab: TabType;
}

export default function ChatHeader({ tab }: ChatHeaderProps) {
  const icon = tab === 'all' ? '🌐' : '🔒';

  // 소켓 리스너(`RoomSocketListener`)가 갱신해 주는 스토어 감시
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );
  const privateRooms = useSpaceStore(state => state.privateRooms);

  const currentPrivateRoom = privateRooms.find(
    room => room.id === currentPrivateRoomId,
  );
  const isMeetingOngoing = currentPrivateRoom?.is_meeting_active ?? false;

  const title =
    tab === 'all' ? '전체 채팅' : (currentPrivateRoom?.name ?? '회의실 채팅');

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <p className="text-sm font-black text-foreground">{title}</p>
        <span
          className={`rounded-full ml-21 px-2 py-0.5 text-[10px] font-bold ${
            isMeetingOngoing
              ? 'bg-red-100 text-red-500'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {isMeetingOngoing ? '🔴 회의 진행 중' : '회의 대기 중'}
        </span>
      </div>
      <ChatCloseButton />
    </div>
  );
}
