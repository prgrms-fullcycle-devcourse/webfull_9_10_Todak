'use client';

import { useMutation } from '@tanstack/react-query';

import { deleteTodos } from './api';

export function useDeleteTodos() {
  return useMutation({
    mutationKey: ['todos', 'delete'],
    mutationFn: ({ roomID, todoID }: { roomID: string; todoID: string }) =>
      deleteTodos(roomID, todoID),
  });
}
