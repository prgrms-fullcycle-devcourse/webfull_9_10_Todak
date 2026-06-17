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
  MinutesLockEvent,
} from '@/services/minutes/model';
import { fetchMinutes, updateMinutes } from '@/services/minutes/api';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useSocket } from '@/providers/SocketProvider';

const GENERATION_FAIL_MESSAGES: Record<string, string> = {
  MINUTES_NO_CHAT_LOG: '회의 중 대화가 없어 회의록을 생성할 수 없습니다',
  MEETING_NOT_FOUND: '회의를 찾을 수 없습니다',
  GENERATION_ERROR: '생성 중 오류가 발생했습니다. 다시 시도해주세요',
};

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useSpaceStore(state => state.currentMinutesId);
  const myId = useSpaceStore(state => state.myChar.id);
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: minutes, isLoading } = useQuery({
    queryKey: ['minutes', currentMinutesId],
    queryFn: () => fetchMinutes(roomId, currentMinutesId!),
    enabled: !!currentMinutesId && !!roomId,
  });

  const [content, setContent] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 편집 락: 현재 편집 중인 유저
  const [editorLock, setEditorLock] = useState<{
    userId: string;
    login: string;
  } | null>(null);
  const [lockDenied, setLockDenied] = useState(false);

  const isMyLock = editorLock?.userId === myId;
  const isEditable = isMyLock; // 내 락일 때만 편집 가능

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

  // 편집 시작 → 락 요청
  const handleStartEdit = () => {
    if (editorLock && !isMyLock) return;
    socket.emit('minutes:request-lock', { minutes_id: currentMinutesId });
  };

  // 저장 후 락 해제
  const handleSave = async (
    overrideContent?: string,
    overrideActionItems?: ActionItem[],
  ) => {
    if (!currentMinutesId) return;
    await updateMinutes(roomId, currentMinutesId, {
      content_md: overrideContent ?? content,
      action_items: overrideActionItems ?? actionItems,
      status: 'confirmed',
    });
    isDirtyRef.current = false;

    // 락 해제
    socket.emit('minutes:release-lock', { minutes_id: currentMinutesId });

    queryClient.invalidateQueries({ queryKey: ['minutes', currentMinutesId] });
  };

  const handleSaveWithItems = async (items: ActionItem[]) => {
    setActionItems(items);
    await handleSave(content, items);
  };

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!currentMinutesId) return;

    // AI 생성 완료 → dirty 해제 후 서버 데이터로 강제 덮어씀
    const handleGenerated = (data: MinutesGeneratedEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      setGenerationError(null);
      isDirtyRef.current = false;
      // 회의 요약, 회의록 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ['minutes'],
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
    const handleMinutesUpdated = (data: MinutesUpdatedEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      if (isDirtyRef.current) return;
      queryClient.invalidateQueries({
        queryKey: ['minutes', currentMinutesId],
      });
    };

    // 락 획득 → 누가 편집 시작했는지 표시
    const handleLockAcquired = (data: MinutesLockEvent) => {
      if (data.minutes_id !== currentMinutesId) return;
      setEditorLock({ userId: data.user_id, login: data.login });
      setLockDenied(false);
    };

    // 락 해제 → 편집 가능해짐
    const handleLockReleased = (data: {
      minutes_id: string;
      user_id: string;
    }) => {
      if (data.minutes_id !== currentMinutesId) return;
      setEditorLock(null);
      isDirtyRef.current = false;
    };

    // 락 거절 → 내가 편집하려 했는데 이미 누가 하고 있음
    const handleLockDenied = (data: { minutes_id: string }) => {
      if (data.minutes_id !== currentMinutesId) return;
      setLockDenied(true);
      setTimeout(() => setLockDenied(false), 3000);
    };

    socket.on('minutes:generated', handleGenerated);
    socket.on('minutes:generation-failed', handleGenerationFailed);
    socket.on('minutes:updated', handleMinutesUpdated);
    socket.on('minutes:lock-acquired', handleLockAcquired);
    socket.on('minutes:lock-released', handleLockReleased);
    socket.on('minutes:lock-denied', handleLockDenied);

    return () => {
      socket.off('minutes:generated', handleGenerated);
      socket.off('minutes:generation-failed', handleGenerationFailed);
      socket.off('minutes:updated', handleMinutesUpdated);
      socket.off('minutes:lock-acquired', handleLockAcquired);
      socket.off('minutes:lock-released', handleLockReleased);
      socket.off('minutes:lock-denied', handleLockDenied);
    };
  }, [currentMinutesId, socket]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes
        minutes={minutes}
        isLoading={isLoading || !isContentReady}
        content={content}
        generationError={generationError}
        editorLock={editorLock}
        isEditable={isEditable}
        lockDenied={lockDenied}
        onContentChange={handleContentChange}
        onStartEdit={handleStartEdit}
        onSave={handleSave}
      />
      <IssueHub
        actionItems={actionItems}
        minutesId={currentMinutesId}
        onActionItemsChange={handleActionItemsChange}
        onSaveWithItems={handleSaveWithItems}
        roomId={roomId}
      />
    </div>
  );
}
