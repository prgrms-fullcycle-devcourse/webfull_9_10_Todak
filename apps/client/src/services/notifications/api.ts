import { apiClient } from '@/lib/api';
import type { NotificationsResponse } from './model';
import { getSampleNotifications } from './sample';

async function fetchNotificationsFromApi(roomID: string) {
  return apiClient.get<NotificationsResponse>(
    `rooms/${roomID}/notifications?limit=5`,
  );
}

async function fetchSampleNotifications(roomID: string) {
  return {
    notifications: getSampleNotifications(roomID),
  };
}

const notificationDataFetchers = {
  api: fetchNotificationsFromApi,
  sample: fetchSampleNotifications,
};

const notificationDataSource: keyof typeof notificationDataFetchers = 'api';

export async function fetchNotifications(roomID: string) {
  return notificationDataFetchers[notificationDataSource](roomID);
}

export interface UpdateReadPayload {
  all?: boolean;
  notification_ids?: string[];
}

export async function updateNotificationsRead(
  roomId: string,
  payload: UpdateReadPayload,
) {
  return apiClient.patch<{
    success: boolean;
    message: string;
    data: { updated_count: number; is_bulk: boolean };
  }>(`rooms/${roomId}/notifications`, payload);
}

export async function deleteNotification(
  roomId: string,
  notificationId: string,
) {
  return apiClient.delete<{
    success: boolean;
    message: string;
    data: { deleted_notification_id: string };
  }>(`rooms/${roomId}/notifications/${notificationId}`);
}

export async function deleteAllNotifications(roomId: string) {
  return apiClient.delete<{
    success: boolean;
    message: string;
    data: { deleted_count: number };
  }>(`rooms/${roomId}/notifications?all=true`);
}
