'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSocketEvent } from '@/hooks/useSocketEvent';

import { todoQueryKeys } from './query';

export type TodoSocketEvent = 'todo:created' | 'todo:updated' | 'todo:deleted';

interface TodoSocketPayload {
  roomId?: string;
  room_id?: string;
}

interface UseTodoSocketOptions {
  enabled?: boolean;
  onEvent?: (eventName: TodoSocketEvent) => void;
  onUpdated?: () => void;
  roomId: string;
}

export function useTodoSocket({
  enabled = true,
  onEvent,
  onUpdated,
  roomId,
}: UseTodoSocketOptions) {
  const queryClient = useQueryClient();
  const isEnabled = enabled && roomId !== '';

  const handleTodoUpdate = useCallback(
    (eventName: TodoSocketEvent, payload?: TodoSocketPayload) => {
      const payloadRoomId = payload?.roomId ?? payload?.room_id;

      if (payloadRoomId && payloadRoomId !== roomId) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: todoQueryKeys.room(roomId) });
      queryClient.invalidateQueries({ queryKey: ['my-todos', roomId] });
      onEvent?.(eventName);
      onUpdated?.();
    },
    [onEvent, onUpdated, queryClient, roomId],
  );

  useSocketEvent<[TodoSocketPayload | undefined]>(
    'todo:created',
    payload => handleTodoUpdate('todo:created', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[TodoSocketPayload | undefined]>(
    'todo:updated',
    payload => handleTodoUpdate('todo:updated', payload),
    { enabled: isEnabled },
  );
  useSocketEvent<[TodoSocketPayload | undefined]>(
    'todo:deleted',
    payload => handleTodoUpdate('todo:deleted', payload),
    { enabled: isEnabled },
  );
}
