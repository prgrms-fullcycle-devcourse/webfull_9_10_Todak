'use client';

import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useSpaceStore } from '@/store/useSpaceStore';
import { PrivateRoom } from '@/services/rooms/model';
import { useQueryClient } from '@tanstack/react-query';

interface SocketMeetingEventPayload {
  private_room_id: string;
}

interface Props {
  roomId: string;
}

export default function MettingSocketListener({ roomId }: Props) {
  const queryClient = useQueryClient();

  useSocketEvent<[SocketMeetingEventPayload]>(
    'meeting:started',
    incomingData => {
      const store = useSpaceStore.getState();

      store.setPrivateRooms(
        store.privateRooms.map(room =>
          room.id === incomingData.private_room_id
            ? { ...room, is_meeting_active: true }
            : room,
        ),
      );

      queryClient.invalidateQueries({ queryKey: ['minutes', roomId] });
    },
    { enabled: Boolean(roomId) },
  );

  useSocketEvent<[SocketMeetingEventPayload]>(
    'meeting:ended',
    incomingData => {
      const store = useSpaceStore.getState();

      store.setPrivateRooms(
        store.privateRooms.map(room =>
          room.id === incomingData.private_room_id
            ? { ...room, is_meeting_active: false }
            : room,
        ),
      );

      queryClient.invalidateQueries({ queryKey: ['minutes', roomId] });

      // 내가 현재 그 프라이빗 룸에 접속해 있는 상태라면 내 로컬 세션도 클리어
      if (store.currentPrivateRoomId === incomingData.private_room_id) {
        store.setCurrentMeetingId(null);
      }
    },
    { enabled: Boolean(roomId) },
  );

  useSocketEvent<[PrivateRoom[]]>(
    'room:private-rooms-updated',
    updatedRooms => {
      const store = useSpaceStore.getState();
      store.setPrivateRooms(updatedRooms);

      queryClient.invalidateQueries({ queryKey: ['minutes', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });

      const myRoom = updatedRooms.find(
        r => r.id === store.currentPrivateRoomId,
      );
      if (myRoom && !myRoom.is_meeting_active) {
        store.setCurrentMeetingId(null);
      }
    },
    { enabled: Boolean(roomId) },
  );

  return null;
}
