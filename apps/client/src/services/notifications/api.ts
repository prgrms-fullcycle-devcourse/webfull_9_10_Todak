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

const notificationDataSource: keyof typeof notificationDataFetchers = 'sample';

export async function fetchNotifications(roomID: string) {
  return notificationDataFetchers[notificationDataSource](roomID);
}
