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
  is_sample?: boolean;
}

export interface NotificationsResponse {
  notifications: RoomNotification[];
}

// PR 소켓 타입 정의
export interface SocketPrPayload {
  roomId: string;
  pull_request: {
    number: number;
    title: string;
    state: string;
    merged: boolean;
    url: string | null;
  };
}

export interface SocketReviewPayload {
  roomId: string;
  review: {
    pull_number: number;
    state: string;
    url: string | null;
  };
}
