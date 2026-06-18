'use client';

import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useSocket } from '@/providers/SocketProvider';
import { fetchMinutes, updateMinutes } from '@/services/minutes/api';
import type {
  ActionItem,
  MinutesGeneratedEvent,
  MinutesGenerationFailedEvent,
  MinutesLockEvent,
  MinutesUpdatedEvent,
} from '@/services/minutes/model';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

const GENERATION_FAIL_MESSAGES: Record<string, string> = {
  MINUTES_NO_CHAT_LOG: '회의 중 대화가 없어 회의록을 생성할 수 없습니다',
  MEETING_NOT_FOUND: '회의를 찾을 수 없습니다',
  GENERATION_ERROR: '생성 중 오류가 발생했습니다. 다시 시도해주세요',
};

interface UseMeetingBoardStateOptions {
  currentMinutesId: string | null;
  roomId: string;
}

export function useMeetingBoardState({
  currentMinutesId,
  roomId,
}: UseMeetingBoardStateOptions) {
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
  const [editorLock, setEditorLock] = useState<{
    userId: string;
    login: string;
  } | null>(null);
  const [lockDenied, setLockDenied] = useState(false);

  const isMyLock = editorLock?.userId === myId;
  const isEditable = isMyLock;
  const isDirtyRef = useRef(false);
  const prevMinutesIdRef = useRef<string | null>(null);
  const isMyLockRef = useRef(false);
  const isContentReady =
    !isLoading &&
    minutes?.content_md !== undefined &&
    minutes?.status !== 'generating';

  useEffect(() => {
    if (!minutes?.content_md) return;
    if (isDirtyRef.current) return;

    setContent(minutes.content_md);
    setActionItems(minutes.action_items ?? []);
  }, [minutes?.action_items, minutes?.content_md, minutes?.updated_at]);

  const handleContentChange = (val: string) => {
    isDirtyRef.current = true;
    setContent(val);
  };

  const handleActionItemsChange = (items: ActionItem[]) => {
    isDirtyRef.current = true;
    setActionItems(items);
  };

  const handleStartEdit = () => {
    if (editorLock && !isMyLock) return;
    socket.emit('minutes:request-lock', { minutes_id: currentMinutesId });
  };

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
    socket.emit('minutes:release-lock', { minutes_id: currentMinutesId });
    queryClient.invalidateQueries({ queryKey: ['minutes', currentMinutesId] });
  };

  const handleSaveWithItems = async (items: ActionItem[]) => {
    setActionItems(items);
    await handleSave(content, items);
  };

  useEffect(() => {
    const prevId = prevMinutesIdRef.current;
    const wasMyLock = isMyLockRef.current;

    if (prevId && prevId !== currentMinutesId && wasMyLock) {
      socket.emit('minutes:release-lock', { minutes_id: prevId });
    }

    prevMinutesIdRef.current = currentMinutesId;
    isMyLockRef.current = false;
    // 회의록 전환 시 이전 편집 락 UI 상태를 즉시 초기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditorLock(null);
    setLockDenied(false);
    isDirtyRef.current = false;
  }, [currentMinutesId, socket]);

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

  useSocketEvent<[{ minutes_id: string; user_id: string }]>(
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

  return {
    actionItems,
    content,
    editorLock,
    generationError,
    handleActionItemsChange,
    handleContentChange,
    handleSave,
    handleSaveWithItems,
    handleStartEdit,
    isContentReady,
    isEditable,
    isLoading,
    lockDenied,
    minutes,
  };
}
