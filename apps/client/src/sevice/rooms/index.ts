import { api, apiClient } from '@/lib/api';

import type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRooms,
} from './model';

export type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRoom,
  MyRooms,
} from './model';

export async function fetchMyRooms(): Promise<MyRooms> {
  return apiClient.get<MyRooms>('/rooms');
}

export function fetchRoomInfo() {}

export function createRooms(params: CreateRoomsParams): Promise<CreatedRoom> {
  return apiClient.post<CreatedRoom, CreateRoomsParams>('/rooms', params);
}

export async function joinRooms(params: JoinRoomParams): Promise<JoinedRoom> {
  const response = await api.post<JoinedRoom>('/rooms/join', params);

  return response.data;
}

export function updateRoomSettings() {}

export function deleteRooms() {}
