import { apiClient } from '@/lib/api';
import type { TodosResponse } from './model';

export async function fetchTodos(roomID: string) {
  return apiClient.get<TodosResponse>(`rooms/${roomID}/todos`, {
    params: { is_issued: true },
  });
}

export async function fetchMyTodos(roomID: string) {
  return apiClient.get<TodosResponse>(`rooms/${roomID}/todos/me`);
}
