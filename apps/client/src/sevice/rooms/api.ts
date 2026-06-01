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
  PrivateRoom,
  EnterPrivateRoomResponse,
  LeavePrivateRoomResponse,
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
  PrivateRoom,
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

export async function fetchPrivateRooms(
  roomId: string,
): Promise<PrivateRoom[]> {
  const response = await api.get<PrivateRoom[]>(
    `/rooms/${roomId}/private-room`,
  );

  return response.data;
}

export async function enterPrivateRoom(roomId: string, privateRoomId: string) {
  return apiClient.post<EnterPrivateRoomResponse>(
    `/rooms/${roomId}/private-room/${privateRoomId}/enter`,
  );
}

export async function leavePrivateRoom(roomId: string, privateRoomId: string) {
  return apiClient.post<LeavePrivateRoomResponse>(
    `/rooms/${roomId}/private-room/${privateRoomId}/leave`,
  );
}
