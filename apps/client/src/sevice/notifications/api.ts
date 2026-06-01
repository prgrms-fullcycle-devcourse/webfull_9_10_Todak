import { apiClient } from '@/lib/api';
import type { NotificationsResponse } from './model';

export async function fetchNotifications(roomID: string) {
  return apiClient.get<NotificationsResponse>(
    `rooms/${roomID}/notifications?limit=5`,
  );
}
