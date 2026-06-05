import { api } from '@/lib/api';
import type {
  ChatMessage,
  FetchChatsParams,
  FetchPrivateChatsParams,
} from './model';

// 메인 룸 채팅 히스토리
export async function fetchMainRoomChats({
  roomId,
  before,
  limit = 50,
}: FetchChatsParams): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', String(limit));

  const response = await api.get<ChatMessage[]>(
    `/rooms/${roomId}/chats?${params}`,
  );
  console.log(response.data);
  return response.data;
}

// 프라이빗 룸 채팅 히스토리
export async function fetchPrivateRoomChats({
  roomId,
  privateRoomId,
  before,
  limit = 50,
}: FetchPrivateChatsParams): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', String(limit));

  const response = await api.get<ChatMessage[]>(
    `/rooms/${roomId}/private-room/${privateRoomId}/chats?${params}`,
  );
  console.log(response.data);
  return response.data;
}
