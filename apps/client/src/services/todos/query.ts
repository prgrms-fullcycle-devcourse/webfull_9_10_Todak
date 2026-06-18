'use client';

import { useMutation } from '@tanstack/react-query';

import { deleteTodos } from './api';

export const todoQueryKeys = {
  all: ['todos'] as const,
  room: (roomId: string) => [...todoQueryKeys.all, roomId] as const,
  mine: (roomId: string) => [...todoQueryKeys.room(roomId), 'me'] as const,
};

export function useDeleteTodos() {
  return useMutation({
    mutationKey: ['todos', 'delete'],
    mutationFn: ({ roomID, todoID }: { roomID: string; todoID: string }) =>
      deleteTodos(roomID, todoID),
  });
}
