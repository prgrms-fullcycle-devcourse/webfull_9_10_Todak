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
import { useRoomUiStore } from '@/store/useRoomUiStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useSocket } from '@/providers/SocketProvider';
import { useSocketEvent } from '@/hooks/useSocketEvent';

const GENERATION_FAIL_MESSAGES: Record<string, string> = {
  MINUTES_NO_CHAT_LOG: '회의 중 대화가 없어 회의록을 생성할 수 없습니다',
  MEETING_NOT_FOUND: '회의를 찾을 수 없습니다',
  GENERATION_ERROR: '생성 중 오류가 발생했습니다. 다시 시도해주세요',
};

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useRoomUiStore(state => state.currentMinutesId);
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

  // 이전 minutesId 추적 (락 해제용)
  const prevMinutesIdRef = useRef<string | null>(null);
  // 이전 락 상태 추적 (락 해제용)
  const isMyLockRef = useRef(false);

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

  // currentMinutesId 바뀔 때
  useEffect(() => {
    const prevId = prevMinutesIdRef.current;
    const wasMyLock = isMyLockRef.current;

    if (prevId && prevId !== currentMinutesId) {
      // 이전 회의록 락 해제 소켓 전송
      if (wasMyLock && prevId) {
        socket.emit('minutes:release-lock', { minutes_id: prevId });
      }
    }

    // 상태 초기화
    prevMinutesIdRef.current = currentMinutesId;
    isMyLockRef.current = false;
    // eslint-disable-next-line
    setEditorLock(null);
    setLockDenied(false);
    isDirtyRef.current = false;
  }, [currentMinutesId, socket]);

  // isMyLock 변할 때마다 ref 동기화
  useEffect(() => {
    isMyLockRef.current = isMyLock;
  }, [isMyLock]);

  useSocketEvent<[MinutesGeneratedEvent]>(
    'minutes:generated',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      setGenerationError(null);
      isDirtyRef.current = false;
      queryClient.invalidateQueries({
        queryKey: ['minutes'],
      });
    },
    { enabled: Boolean(currentMinutesId) },
  );

  useSocketEvent<[MinutesGenerationFailedEvent]>(
    'minutes:generation-failed',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      const msg =
        GENERATION_FAIL_MESSAGES[data.reason] ??
        '알 수 없는 오류가 발생했습니다';
      setGenerationError(msg);
    },
    { enabled: Boolean(currentMinutesId) },
  );

  useSocketEvent<[MinutesUpdatedEvent]>(
    'minutes:updated',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      if (isDirtyRef.current) return;
      queryClient.invalidateQueries({
        queryKey: ['minutes', currentMinutesId],
      });
    },
    { enabled: Boolean(currentMinutesId) },
  );

  useSocketEvent<[MinutesLockEvent]>(
    'minutes:lock-acquired',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      setEditorLock({ userId: data.user_id, login: data.login });
      setLockDenied(false);
    },
    { enabled: Boolean(currentMinutesId) },
  );

  useSocketEvent<
    [
      {
        minutes_id: string;
        user_id: string;
      },
    ]
  >(
    'minutes:lock-released',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      setEditorLock(null);
      isDirtyRef.current = false;
    },
    { enabled: Boolean(currentMinutesId) },
  );

  useSocketEvent<[{ minutes_id: string }]>(
    'minutes:lock-denied',
    data => {
      if (data.minutes_id !== currentMinutesId) return;
      setLockDenied(true);
      setTimeout(() => setLockDenied(false), 3000);
    },
    { enabled: Boolean(currentMinutesId) },
  );

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
