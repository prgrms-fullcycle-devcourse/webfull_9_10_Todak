import { useQuery } from '@tanstack/react-query';
import {
  fetchMainRoomChats,
  fetchPrivateRoomChats,
} from '@/services/chats/api';
import { TabType } from '../_types';

export function useChatHistory(
  roomId: string,
  privateRoomId?: string | null,
  tab?: TabType,
) {
  return useQuery({
    queryKey: ['chats', roomId, privateRoomId ?? 'main'],
    queryFn: () =>
      privateRoomId
        ? fetchPrivateRoomChats({ roomId, privateRoomId })
        : fetchMainRoomChats({ roomId }),
    enabled: tab === 'private' ? !!privateRoomId : !!roomId,
  });
}
