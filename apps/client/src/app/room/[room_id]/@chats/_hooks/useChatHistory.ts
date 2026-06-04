import { useQuery } from '@tanstack/react-query';
import { fetchMainRoomChats } from '@/services/chats/api';

export function useChatHistory(roomId: string) {
  return useQuery({
    queryKey: ['chats', roomId],
    queryFn: () => fetchMainRoomChats({ roomId }),
    enabled: !!roomId,
  });
}
