export type ChatType = 'text' | 'meeting_start' | 'meeting_end';

export interface ChatUser {
  github_username: string;
  avatar_url: string;
}

export interface ChatMessage {
  id: string;
  user: ChatUser;
  content: string | null;
  type: ChatType;
  created_at: string;
}

export interface FetchChatsParams {
  roomId: string;
  before?: string;
  limit?: number;
}

export interface FetchPrivateChatsParams extends FetchChatsParams {
  privateRoomId: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  me: boolean; // 내가 누른 리액션인지
}

export interface ChatMessage {
  id: string;
  room_id: string;
  private_room_id: string | null;
  user: {
    github_username: string;
    avatar_url: string;
  };
  content: string | null;
  type: 'text' | 'meeting_start' | 'meeting_end';
  created_at: string;
  reactions: Reaction[];
}

export interface ChatReactionEvent {
  message_id: string;
  room_id: string;
  private_room_id: string | null;
  emoji: string;
  user: { id: string; github_username: string; avatar_url: string };
  action: 'added' | 'removed';
}
