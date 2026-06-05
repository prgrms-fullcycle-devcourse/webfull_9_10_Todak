import { useQuery } from '@tanstack/react-query';
import {
  fetchMainRoomChats,
  fetchPrivateRoomChats,
} from '@/services/chats/api';

export function useChatHistory(roomId: string, privateRoomId?: string | null) {
  return useQuery({
    queryKey: ['chats', roomId, privateRoomId ?? 'main'],
    queryFn: () =>
      privateRoomId
        ? fetchPrivateRoomChats({ roomId, privateRoomId })
        : fetchMainRoomChats({ roomId }),
    enabled: !!roomId,
  });
}
