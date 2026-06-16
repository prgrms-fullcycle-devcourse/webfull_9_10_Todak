'use client';

import {
  endMeeting,
  generateMinutes,
  startMeeting,
} from '@/services/minutes/api';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useState } from 'react';

interface Props {
  meetingStatus: 'ongoing' | 'ended' | 'cancelled';
  onToggle: () => void;
  roomId: string;
}

export default function ChatMeetingButton({ onToggle, roomId }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  // Zustand 전역 스토어 구독
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );
  const privateRooms = useSpaceStore(state => state.privateRooms);
  const currentMeetingId = useSpaceStore(state => state.currentMeetingId);
  const setCurrentMeetingId = useSpaceStore(state => state.setCurrentMeetingId);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);
  const currentPrivateRoom = privateRooms.find(
    room => room.id === currentPrivateRoomId,
  );

  // 소켓 감지 시 변경
  const isMeetingOngoing = currentPrivateRoom?.is_meeting_active ?? false;

  // 다른 멤버가 시작했는지 여부 판정
  // 방은 회의 중(`true`)인데, 내 로컬 메모리에 미팅 세션 ID(`currentMeetingId`)가 없다면 다른 사람이 켠 걸로 판정
  const isMeetingStartedByAnotherMember = isMeetingOngoing && !currentMeetingId;
  const isDisabled = isLoading || isMeetingStartedByAnotherMember;

  const handleClick = async () => {
    if (isDisabled) return;
    setIsLoading(true);

    try {
      if (!isMeetingOngoing) {
        if (!currentPrivateRoomId) return;
        // 회의 시작
        const meeting = await startMeeting(roomId, currentPrivateRoomId);
        setCurrentMeetingId(meeting.id);
        onToggle();
      } else {
        // 회의 종료
        if (!currentMeetingId) return;
        const endedMeeting = await endMeeting(roomId, currentMeetingId);

        // AI 회의록 자동 생성 요청
        // ended_at으로 제목 생성
        const endedAt = new Date(endedMeeting.ended_at);
        const title = `${endedAt.getFullYear()}.${String(endedAt.getMonth() + 1).padStart(2, '0')}.${String(endedAt.getDate()).padStart(2, '0')} ${String(endedAt.getHours()).padStart(2, '0')}:${String(endedAt.getMinutes()).padStart(2, '0')} 회의록`;

        await generateMinutes(roomId, currentMeetingId, title);

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
        disabled={isDisabled}
        title={
          isMeetingStartedByAnotherMember
            ? '같은 회의실에서 이미 회의가 진행 중입니다.'
            : undefined
        }
        className={`w-full rounded-xl py-2.5 text-xs font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          isMeetingStartedByAnotherMember
            ? 'bg-slate-400'
            : !isMeetingOngoing
              ? 'bg-todak-coral-500 hover:bg-todak-coral-600'
              : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        {isMeetingStartedByAnotherMember
          ? '이미 회의가 진행 중이에요'
          : !isMeetingOngoing
            ? '🚀 회의 시작하기 (AI 분석 활성화)'
            : '✋ 회의 종료 및 AI 요약본 분석하기'}
      </button>
      {isMeetingStartedByAnotherMember && (
        <p
          aria-live="polite"
          className="mt-1.5 text-center text-[11px] font-bold text-slate-500"
        >
          회의가 종료되면 다시 시작할 수 있어요.
        </p>
      )}
    </div>
  );
}
