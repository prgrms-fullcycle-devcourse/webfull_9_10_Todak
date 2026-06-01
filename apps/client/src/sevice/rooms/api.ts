import { api, apiClient } from '@/lib/api';
import { isTodakApiError } from '@/sevice/error';

import type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRooms,
  CreateRoomProfileParams,
  RoomProfile,
} from './model';

export type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRoom,
  MyRooms,
  RoomMembers,
  RoomProfile,
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

export function isRoomProfileAlreadySetUpError(error: unknown) {
  return isTodakApiError(error) && error.response.status === 409;
}

export async function createRoomProfile(
  params: CreateRoomProfileParams,
): Promise<RoomProfile> {
  const { roomID, ...profile } = params;

  return apiClient.post<RoomProfile, typeof profile>(
    `/rooms/${roomID}/members/setup`,
    profile,
  );
}
