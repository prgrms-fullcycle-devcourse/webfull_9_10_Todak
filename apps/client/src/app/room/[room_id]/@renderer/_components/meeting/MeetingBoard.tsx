'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import IssueHub from './IssueHub';
import MeetingMinutes from './MeetingMinutes';
import { useState, useEffect, useRef } from 'react';
import {
  ActionItem,
  MinutesGeneratedEvent,
  MinutesGenerationFailedEvent,
  MinutesUpdatedEvent,
} from '@/services/minutes/model';
import { fetchMinutes, updateMinutes } from '@/services/minutes/api';
import { useSpaceStore } from '@/store/useSpaceStore';
import { getSocket } from '@/lib/socket';
import { getAuthToken } from '@/lib/auth';

const GENERATION_FAIL_MESSAGES: Record<string, string> = {
  MINUTES_NO_CHAT_LOG: '회의 중 대화가 없어 회의록을 생성할 수 없습니다',
  MEETING_NOT_FOUND: '회의를 찾을 수 없습니다',
  GENERATION_ERROR: '생성 중 오류가 발생했습니다. 다시 시도해주세요',
};

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useSpaceStore(state => state.currentMinutesId);
  const queryClient = useQueryClient();

  const { data: minutes, isLoading } = useQuery({
    queryKey: ['minutes', currentMinutesId],
    queryFn: () => fetchMinutes(roomId, currentMinutesId!),
    enabled: !!currentMinutesId && !!roomId,
  });

  const [content, setContent] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 유저가 직접 수정 중인지 여부
  const isDirtyRef = useRef(false);

  // 서버 데이터가 준비됐는지 여부
  const isContentReady =
    !isLoading &&
    minutes?.content_md !== undefined &&
    minutes?.status !== 'generating';

  // minutes 로드/업데이트 시 로컬 상태 동기화
  // isDirty일 때는 무시 (유저 수정값 보호)
  useEffect(() => {
    if (!minutes?.content_md) return;
    if (isDirtyRef.current) return;

    setContent(minutes.content_md);
    setActionItems(minutes.action_items ?? []);
  }, [minutes?.content_md, minutes?.updated_at]);

  const handleContentChange = (val: string) => {
    isDirtyRef.current = true;
    setContent(val);
  };

  const handleActionItemsChange = (items: ActionItem[]) => {
    isDirtyRef.current = true;
    setActionItems(items);
  };

  // 저장 함수
  const handleSave = async () => {
    if (!currentMinutesId) return;
    await updateMinutes(roomId, currentMinutesId, {
      content_md: content,
      action_items: actionItems,
      status: 'confirmed',
    });
    // 저장 완료 후 dirty 해제 → 이후 서버 업데이트 다시 수신 가능
    isDirtyRef.current = false;
    queryClient.invalidateQueries({ queryKey: ['minutes', currentMinutesId] });
  };

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!currentMinutesId) return;

    const socket = getSocket(getAuthToken() ?? undefined);
    if (!socket.connected) socket.connect();

    // AI 생성 완료 → dirty 해제 후 서버 데이터로 강제 덮어씀
    const handleGenerated = (data: MinutesGeneratedEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      setGenerationError(null);
      isDirtyRef.current = false;
      queryClient.invalidateQueries({
        queryKey: ['minutes', currentMinutesId],
      });
    };

    // AI 생성 실패 → 에러 메시지 표시
    const handleGenerationFailed = (data: MinutesGenerationFailedEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      const msg =
        GENERATION_FAIL_MESSAGES[data.reason] ??
        '알 수 없는 오류가 발생했습니다';
      setGenerationError(msg);
    };

    // 다른 유저가 저장했을 때 실시간 반영
    // 단, 내가 수정 중이면 무시 (내 수정값 보호)
    // ※ 서버에서 minutes:updated 이벤트를 broadcast해줘야 동작함
    const handleMinutesUpdated = (data: MinutesUpdatedEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      if (isDirtyRef.current) return;
      queryClient.invalidateQueries({
        queryKey: ['minutes', currentMinutesId],
      });
    };

    socket.on('minutes:generated', handleGenerated);
    socket.on('minutes:generation-failed', handleGenerationFailed);
    socket.on('minutes:updated', handleMinutesUpdated);

    return () => {
      socket.off('minutes:generated', handleGenerated);
      socket.off('minutes:generation-failed', handleGenerationFailed);
      socket.off('minutes:updated', handleMinutesUpdated);
    };
  }, [currentMinutesId]);

  console.log('currentMinutesId:', currentMinutesId);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes
        minutes={minutes}
        isLoading={isLoading || !isContentReady}
        content={content}
        generationError={generationError}
        onContentChange={handleContentChange}
        onSave={handleSave}
      />
      <IssueHub
        actionItems={actionItems}
        minutesId={currentMinutesId}
        onActionItemsChange={handleActionItemsChange}
        onSave={handleSave}
        roomId={roomId}
      />
    </div>
  );
}
