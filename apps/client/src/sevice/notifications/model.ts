export type NotificationType =
  | 'pr_opened'
  | 'pr_merged'
  | 'minutes_generated'
  | 'new_issue'
  | string;

export interface RoomNotification {
  id: string;
  room_id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: RoomNotification[];
}
