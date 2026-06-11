import { apiServer } from '@/lib/api.server';
import { PublicRoomInfo } from './model';

export async function fetchRoomInfo(roomID: string) {
  return apiServer.get<PublicRoomInfo>(`/rooms/${roomID}/public`);
}
