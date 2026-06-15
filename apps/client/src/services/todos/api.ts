import { apiClient } from '@/lib/api';
import type {
  CreateTodoLabelPayload,
  TodoCommentPayload,
  TodoCommentResponse,
  TodoCommentsResponse,
  TodoEventsResponse,
  TodoLabelResponse,
  TodoLabelsResponse,
  TodoMilestonesResponse,
  TodoMutationDeleteResponse,
  TodoReactionPayload,
  TodoReactionResponse,
  TodoResponse,
  TodosDeleteResponse,
  TodosResponse,
  UpdateTodoLabelPayload,
  UpdateTodoPayload,
} from './model';

export type {
  CreateTodoLabelPayload,
  Todo,
  TodoComment,
  TodoCommentPayload,
  TodoCommentResponse,
  TodoCommentsResponse,
  TodoEvent,
  TodoEventsResponse,
  TodoLabel,
  TodoLabelResponse,
  TodoLabelsResponse,
  TodoMilestone,
  TodoMilestonesResponse,
  TodoMutationDeleteResponse,
  TodoReaction,
  TodoReactionContent,
  TodoReactionPayload,
  TodoReactionResponse,
  TodoResponse,
  TodosDeleteResponse,
  TodosResponse,
  UpdateTodoLabelPayload,
  UpdateTodoPayload,
} from './model';

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

export async function fetchTodo(roomID: string, todoID: string) {
  return apiClient.get<TodoResponse>(`rooms/${roomID}/todos/${todoID}`);
}

export async function updateTodo(
  roomID: string,
  todoID: string,
  payload: UpdateTodoPayload,
) {
  return apiClient.patch<TodoResponse, UpdateTodoPayload>(
    `rooms/${roomID}/todos/${todoID}`,
    payload,
  );
}

export async function fetchTodoLabels(roomID: string) {
  return apiClient.get<TodoLabelsResponse>(`rooms/${roomID}/todos/labels`);
}

export async function createTodoLabel(
  roomID: string,
  payload: CreateTodoLabelPayload,
) {
  return apiClient.post<TodoLabelResponse, CreateTodoLabelPayload>(
    `rooms/${roomID}/todos/labels`,
    payload,
  );
}

export async function updateTodoLabel(
  roomID: string,
  labelName: string,
  payload: UpdateTodoLabelPayload,
) {
  return apiClient.patch<TodoLabelResponse, UpdateTodoLabelPayload>(
    `rooms/${roomID}/todos/labels/${encodeURIComponent(labelName)}`,
    payload,
  );
}

export async function deleteTodoLabel(roomID: string, labelName: string) {
  return apiClient.delete<TodoMutationDeleteResponse>(
    `rooms/${roomID}/todos/labels/${encodeURIComponent(labelName)}`,
  );
}

export async function fetchTodoMilestones(roomID: string) {
  return apiClient.get<TodoMilestonesResponse>(
    `rooms/${roomID}/todos/milestones`,
  );
}

export async function fetchTodoComments(roomID: string, todoID: string) {
  return apiClient.get<TodoCommentsResponse>(
    `rooms/${roomID}/todos/${todoID}/comments`,
  );
}

export async function createTodoComment(
  roomID: string,
  todoID: string,
  payload: TodoCommentPayload,
) {
  return apiClient.post<TodoCommentResponse, TodoCommentPayload>(
    `rooms/${roomID}/todos/${todoID}/comments`,
    payload,
  );
}

export async function updateTodoComment(
  roomID: string,
  todoID: string,
  commentID: string,
  payload: TodoCommentPayload,
) {
  return apiClient.patch<TodoCommentResponse, TodoCommentPayload>(
    `rooms/${roomID}/todos/${todoID}/comments/${commentID}`,
    payload,
  );
}

export async function deleteTodoComment(
  roomID: string,
  todoID: string,
  commentID: string,
) {
  return apiClient.delete<TodoMutationDeleteResponse>(
    `rooms/${roomID}/todos/${todoID}/comments/${commentID}`,
  );
}

export async function fetchTodoEvents(roomID: string, todoID: string) {
  return apiClient.get<TodoEventsResponse>(
    `rooms/${roomID}/todos/${todoID}/events`,
  );
}

export async function createTodoReaction(
  roomID: string,
  todoID: string,
  payload: TodoReactionPayload,
) {
  return apiClient.post<TodoReactionResponse, TodoReactionPayload>(
    `rooms/${roomID}/todos/${todoID}/reactions`,
    payload,
  );
}

export async function deleteTodoReaction(
  roomID: string,
  todoID: string,
  reactionID: string,
) {
  return apiClient.delete<TodoMutationDeleteResponse>(
    `rooms/${roomID}/todos/${todoID}/reactions/${reactionID}`,
  );
}
