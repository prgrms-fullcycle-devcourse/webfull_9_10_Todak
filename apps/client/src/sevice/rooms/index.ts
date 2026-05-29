import { apiClient } from '@/lib/api';

import { MyRooms } from '../models/my-room';

export async function fetchMyRooms(): Promise<MyRooms> {
  return apiClient.get<MyRooms>('/rooms');
}

export function fetchRoomInfo() {}

export type CreateRoomsParams = {
  name: string;
  repo_full_name: string;
  max_members?: number;
};

export type CreatedRoom = {
  id: string;
  name: string;
  invite_code: string;
  repo_full_name: string;
  webhook_registered: boolean;
};

export function createRooms(params: CreateRoomsParams): Promise<CreatedRoom> {
  return apiClient.post<CreatedRoom, CreateRoomsParams>('/rooms', params);
}

export function joinRooms() {}

export function updateRoomSettings() {}

export function deleteRooms() {}
