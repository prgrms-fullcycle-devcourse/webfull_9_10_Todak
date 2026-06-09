import { apiClient } from '@/lib/api';
import type { TodosDeleteResponse, TodosResponse } from './model';

export interface FetchTodosParams {
  is_issued?: boolean;
  minutes_id?: string;
  assignee_id?: string;
}

export async function fetchTodos(
  roomID: string,
  extraParams?: FetchTodosParams,
) {
  return apiClient.get<TodosResponse>(`rooms/${roomID}/todos`, {
    params: {
      is_issued: true,
      ...extraParams,
    },
  });
}

export async function fetchMyTodos(roomID: string) {
  return apiClient.get<TodosResponse>(`rooms/${roomID}/todos/me`);
}

export async function deleteTodos(roomID: string, todoID: string) {
  return apiClient.delete<TodosDeleteResponse>(
    `rooms/${roomID}/todos/${todoID}`,
  );
}
