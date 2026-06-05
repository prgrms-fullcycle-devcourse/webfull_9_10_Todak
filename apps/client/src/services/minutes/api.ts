import { apiClient } from '@/lib/api';
import { Minute } from './model';

export async function fetchMeetingLogs(roomID: string) {
  return apiClient.get<Minute[]>(`/rooms/${roomID}/meetings`);
}
