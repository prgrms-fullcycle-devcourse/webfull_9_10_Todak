export type ChatType = 'text' | 'meeting_start' | 'meeting_end';

export interface ChatUser {
  github_username: string;
  nickname: string | null;
  avatar_url: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  me: boolean;
}

export interface ChatAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface PendingAttachment {
  s3Key: string;
  fileName: string;
  mime: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  private_room_id: string | null;
  user: ChatUser;
  content: string | null;
  type: ChatType;
  created_at: string;
  reactions: Reaction[];
  attachments: ChatAttachment[];
}

export interface FetchChatsParams {
  roomId: string;
  before?: string;
  limit?: number;
}

export interface FetchPrivateChatsParams extends FetchChatsParams {
  privateRoomId: string;
}

export interface ChatReactionEvent {
  message_id: string;
  room_id: string;
  private_room_id: string | null;
  emoji: string;
  user: { id: string; github_username: string; avatar_url: string };
  action: 'added' | 'removed';
}
