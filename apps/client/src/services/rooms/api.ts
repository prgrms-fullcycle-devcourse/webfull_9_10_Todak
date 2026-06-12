import { api, apiClient } from '@/lib/api';
import { isTodakApiError } from '@/services/error';

import type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRooms,
  CreateRoomProfileParams,
  RoomInfo,
  RoomProfile,
  PrivateRoom,
  EnterPrivateRoomResponse,
  LeavePrivateRoomResponse,
  MemberStatus,
  StatusResponse,
  RoomMembers,
  UpdatedRoomSettings,
  UpdateRoomSettingsParams,
  ConnectedRoomRepository,
  ConnectRoomRepositoryParams,
} from './model';
import { AuthTokenPayload } from '@/lib/auth';

export type {
  CreatedRoom,
  CreateRoomsParams,
  JoinedRoom,
  JoinRoomParams,
  MyRoom,
  MyRooms,
  RoomInfo,
  RoomMembers,
  RoomProfile,
  PrivateRoom,
  UpdatedRoomSettings,
  UpdateRoomSettingsParams,
  ConnectedRoomRepository,
  ConnectRoomRepositoryParams,
} from './model';

export async function fetchMyRooms(): Promise<MyRooms> {
  return apiClient.get<MyRooms>('/rooms');
}

export function fetchRoomInfo(roomID: string): Promise<RoomInfo> {
  return apiClient.get<RoomInfo>(`/rooms/${roomID}`);
}

export function createRooms(params: CreateRoomsParams): Promise<CreatedRoom> {
  return apiClient.post<CreatedRoom, CreateRoomsParams>('/rooms', params);
}

export async function joinRooms(params: JoinRoomParams): Promise<JoinedRoom> {
  const response = await api.post<JoinedRoom>('/rooms/join', params);

  return response.data;
}

export function updateRoomSettings(
  roomId: string,
  params: UpdateRoomSettingsParams,
): Promise<UpdatedRoomSettings> {
  return apiClient.patch<UpdatedRoomSettings, UpdateRoomSettingsParams>(
    `/rooms/${roomId}`,
    params,
  );
}

export function connectRoomRepository(
  roomId: string,
  params: ConnectRoomRepositoryParams,
): Promise<ConnectedRoomRepository> {
  return apiClient.put<ConnectedRoomRepository, ConnectRoomRepositoryParams>(
    `/rooms/${roomId}/repo`,
    params,
  );
}

export function disconnectRoomRepository(roomId: string): Promise<void> {
  return apiClient.delete<void>(`/rooms/${roomId}/repo`);
}

export function deleteRooms() {}

export function isRoomProfileAlreadySetUpError(error: unknown) {
  return isTodakApiError(error) && error.response.status === 409;
}

export function fetchMyProfile(): Promise<AuthTokenPayload> {
  return apiClient.get<AuthTokenPayload>('/users/me');
}

export function fetchRoomMembers(roomId: string): Promise<RoomMembers> {
  return apiClient.get<RoomMembers>(`/rooms/${roomId}/members`);
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

export async function updateMemberStatus(roomId: string, status: MemberStatus) {
  const response = await apiClient.patch<StatusResponse>(
    `/rooms/${roomId}/members/me/status`,
    {
      status: status,
    },
  );
  return response.data;
}

export function updateRoomProfile(
  roomId: string,
  body: {
    character_type?: string;
    nickname?: string;
    roles?: string[];
    detailed_role?: string | null;
  },
): Promise<RoomProfile> {
  return apiClient.patch(`/rooms/${roomId}/members/me`, body);
}
