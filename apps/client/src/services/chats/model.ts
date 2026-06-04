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
