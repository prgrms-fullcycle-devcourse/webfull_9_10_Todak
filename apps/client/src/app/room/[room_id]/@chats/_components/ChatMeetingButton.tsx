'use client';

import { endMeeting, startMeeting } from '@/services/minutes/api';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useState } from 'react';

interface Props {
  meetingStatus: 'ongoing' | 'ended' | 'cancelled';
  onToggle: () => void;
  roomId: string;
}

export default function ChatMeetingButton({
  meetingStatus,
  onToggle,
  roomId,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );
  const currentMeetingId = useSpaceStore(state => state.currentMeetingId);
  const setCurrentMeetingId = useSpaceStore(state => state.setCurrentMeetingId);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (meetingStatus === 'ended') {
        // 회의 시작
        const meeting = await startMeeting(roomId, currentPrivateRoomId!);
        setCurrentMeetingId(meeting.id);
        onToggle();
      } else {
        // 회의 종료
        if (!currentMeetingId) return;
        await endMeeting(roomId, currentMeetingId);
        setCurrentMeetingId(null);
        onToggle();
        setCurrentView('meeting'); // 회의 보드로 전환
      }
    } catch (error) {
      console.error('회의 시작/종료 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="shrink-0 border-b border-border bg-surface px-3 py-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full rounded-xl py-2.5 text-xs font-black text-white transition-all disabled:opacity-60 ${
          meetingStatus === 'ended'
            ? 'bg-todak-coral-500 hover:bg-todak-coral-600'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        {isLoading
          ? '처리 중...'
          : meetingStatus === 'ended'
            ? '🚀 회의 시작하기 (AI 분석 활성화)'
            : '✋ 회의 종료 및 AI 요약본 분석하기'}
      </button>
    </div>
  );
}
