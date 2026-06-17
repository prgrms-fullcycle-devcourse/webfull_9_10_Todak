'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
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

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    // 회의 시작 소켓 수신
    const handleMeetingStarted = (incomingData: SocketMeetingEventPayload) => {
      const store = useSpaceStore.getState();

      // Zustand 스토어 명부에서 해당 회의실의 활성화 상태를 실시간 변경
      store.setPrivateRooms(
        store.privateRooms.map(room =>
          room.id === incomingData.private_room_id
            ? { ...room, is_meeting_active: true }
            : room,
        ),
      );

      // 채팅창 쿼리 즉시 갱신
      queryClient.invalidateQueries({ queryKey: ['minutes', roomId] });
    };

    // 회의 종료 소켓 수신
    const handleMeetingEnded = (incomingData: SocketMeetingEventPayload) => {
      const store = useSpaceStore.getState();

      // Zustand 스토어 내 회의실 불 끄기
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
    };

    // 마지막 퇴장자가 튕겨 나갔을 때 백엔드가 주는 자동 정산 명부 수신 가드
    const handlePrivateRoomsUpdated = (updatedRooms: PrivateRoom[]) => {
      const store = useSpaceStore.getState();
      store.setPrivateRooms(updatedRooms);

      // 방 명부가 업데이트되면 무조건 리액트 쿼리 장부를 털어 정적 Prop 갱신
      queryClient.invalidateQueries({ queryKey: ['minutes', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });

      const myRoom = updatedRooms.find(
        r => r.id === store.currentPrivateRoomId,
      );
      if (myRoom && !myRoom.is_meeting_active) {
        store.setCurrentMeetingId(null);
      }
    };

    // 주파수 동시 대기 모드 가동
    socket.on('meeting:started', handleMeetingStarted);
    socket.on('meeting:ended', handleMeetingEnded);
    socket.on('room:private-rooms-updated', handlePrivateRoomsUpdated);

    return () => {
      socket.off('meeting:started', handleMeetingStarted);
      socket.off('meeting:ended', handleMeetingEnded);
      socket.off('room:private-rooms-updated', handlePrivateRoomsUpdated);
    };
  }, [roomId, queryClient]);

  return null;
}
