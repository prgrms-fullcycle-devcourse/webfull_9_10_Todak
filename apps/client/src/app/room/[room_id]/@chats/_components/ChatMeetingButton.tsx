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
  onMeetingStatusChange: (isActive: boolean) => void;
  roomId: string;
}

const MEETING_BOUNDARY_EVENT = 'todak:meeting-boundary';

export default function ChatMeetingButton({
  meetingStatus,
  onMeetingStatusChange,
  roomId,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );
  const currentMeetingId = useSpaceStore(state => state.currentMeetingId);
  const setCurrentMeetingId = useSpaceStore(state => state.setCurrentMeetingId);
  const currentMeetingHostId = useSpaceStore(
    state => state.currentMeetingHostId,
  );
  const setCurrentMeetingHostId = useSpaceStore(
    state => state.setCurrentMeetingHostId,
  );
  const myCharId = useSpaceStore(state => state.myChar.id);
  const setCurrentView = useSpaceStore(state => state.setCurrentView);

  const isMeetingActive = meetingStatus === 'ongoing';
  const isCurrentUserHost =
    currentMeetingHostId !== null && currentMeetingHostId === myCharId;
  const isBlockedByOtherMeeting =
    isMeetingActive && (!currentMeetingId || !isCurrentUserHost);
  const isDisabled =
    isLoading || !currentPrivateRoomId || isBlockedByOtherMeeting;

  const handleClick = async () => {
    if (isDisabled) return;
    setIsLoading(true);

    try {
      if (meetingStatus === 'ended') {
        // 회의 시작
        const meeting = await startMeeting(roomId, currentPrivateRoomId!);
        setCurrentMeetingId(meeting.id);
        setCurrentMeetingHostId(meeting.host_id);
        onMeetingStatusChange(true);
        window.dispatchEvent(
          new CustomEvent(MEETING_BOUNDARY_EVENT, {
            detail: {
              roomId,
              privateRoomId: currentPrivateRoomId,
              type: 'meeting_start',
              createdAt: meeting.started_at,
            },
          }),
        );
      } else {
        // 회의 종료
        if (!currentMeetingId) return;
        const meetingIdToEnd = currentMeetingId;
        const endedMeeting = await endMeeting(roomId, meetingIdToEnd);
        window.dispatchEvent(
          new CustomEvent(MEETING_BOUNDARY_EVENT, {
            detail: {
              roomId,
              privateRoomId: currentPrivateRoomId,
              type: 'meeting_end',
              createdAt: endedMeeting.ended_at,
            },
          }),
        );

        // AI 회의록 자동 생성 요청
        // ended_at으로 제목 생성
        const endedAt = new Date(endedMeeting.ended_at);
        const title = `${endedAt.getFullYear()}.${String(endedAt.getMonth() + 1).padStart(2, '0')}.${String(endedAt.getDate()).padStart(2, '0')} ${String(endedAt.getHours()).padStart(2, '0')}:${String(endedAt.getMinutes()).padStart(2, '0')} 회의록`;

        setCurrentMeetingId(null);
        setCurrentMeetingHostId(null);
        onMeetingStatusChange(false);

        await generateMinutes(roomId, meetingIdToEnd, title);

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
          isBlockedByOtherMeeting
            ? '다른 팀원이 회의를 진행 중입니다.'
            : undefined
        }
        className={`w-full rounded-xl py-2.5 text-xs font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          meetingStatus === 'ended'
            ? 'bg-todak-coral-500 hover:bg-todak-coral-600'
            : isCurrentUserHost
              ? 'bg-slate-800 hover:bg-slate-700'
              : 'bg-slate-400'
        }`}
      >
        {isLoading
          ? '처리 중...'
          : meetingStatus === 'ended'
            ? '🚀 회의 시작하기 (AI 분석 활성화)'
            : isCurrentUserHost
              ? '✋ 회의 종료 및 AI 요약본 분석하기'
              : '🔒 다른 팀원이 회의 진행 중'}
      </button>
    </div>
  );
}
