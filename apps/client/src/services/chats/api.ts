import { api } from '@/lib/api';
import type {
  ChatMessage,
  FetchChatsParams,
  FetchPrivateChatsParams,
} from './model';

// 1) 서버에서 presigned PUT URL + s3Key 발급
// 2) presigned URL로 S3에 직접 업로드 (인증 헤더 불필요)
export async function uploadChatAttachment(
  roomId: string,
  file: File,
): Promise<{ s3Key: string }> {
  const { data } = await api.post<{ upload_url: string; s3_key: string }>(
    `/rooms/${roomId}/chats/attachments`,
    { mime: file.type, size: file.size },
  );

  const s3Res = await fetch(data.upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!s3Res.ok) {
    const text = await s3Res.text().catch(() => '');
    throw new Error(`S3 upload failed: ${s3Res.status} ${text}`);
  }

  return { s3Key: data.s3_key };
}

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
  return response.data;
}
