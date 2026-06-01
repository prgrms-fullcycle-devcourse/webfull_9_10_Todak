import { useEffect, useState } from 'react';
import { useSpaceStore } from '@/store/useSpaceStore';
import { STATIC_ROOM_BOUNDS } from '../_constants/roomBounds';
import { getSocket } from '@/lib/socket';
import { fetchPrivateRooms } from '@/sevice/rooms/api';
import { type PrivateRoom } from '@/sevice/rooms/model';

export function useInitRooms(roomId: string) {
  const [isReady, setIsReady] = useState(false);
  const setPrivateRooms = useSpaceStore(state => state.setPrivateRooms);

  const fetchAndUpdateRooms = async () => {
    try {
      const response = (await fetchPrivateRooms(roomId)) as unknown;
      let fetchedRooms: PrivateRoom[] = [];

      if (Array.isArray(response)) {
        fetchedRooms = response as PrivateRoom[];
      } else if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        Array.isArray((response as { data: unknown }).data)
      ) {
        fetchedRooms = (response as { data: PrivateRoom[] }).data;
      }

      const dynamicConfig = STATIC_ROOM_BOUNDS.map((bounds, idx) => {
        const apiRoom = fetchedRooms[idx];
        return {
          id: apiRoom ? apiRoom.id : `empty-room-${idx}`,
          name: apiRoom ? apiRoom.name : `미지정 회의실`,
          bounds: bounds,
          isActive: apiRoom ? apiRoom.is_meeting_active : false,
          color: 0xffffff,
        };
      });

      window.DYNAMIC_ROOMS_CONFIG = dynamicConfig;
      setPrivateRooms(fetchedRooms);
    } catch (error) {
      console.error('회의실 데이터 새로고침 실패:', error);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    fetchAndUpdateRooms().then(() => setIsReady(true));

    const socket = getSocket();
    // 소켓 연결 확인
    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      socket.emit('room:join', roomId);
    };

    socket.on('connect_error', error => {
      console.error('소켓 연결 실패 :', error.message);
    });

    // 룸 소켓 채널 구독
    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', () => {
        console.log('소켓 연결 성공! 내 소켓 ID:', socket.id);
        joinRoom();
      });
    }

    // 모두에게 오는 이벤트 리스너
    socket.on('room:private-rooms-updated', () => {
      console.log('[소켓] 회의실 정보 업데이트 (ON AIR 뱃지 등 변경)');
      fetchAndUpdateRooms();
    });

    socket.on('room:member-status-changed', () => {
      console.log('[소켓] 멤버 상태 변경 (집중, 휴식 등)');
      fetchAndUpdateRooms();
    });

    // 나 이외의 다른 유저에게만 오는 이벤트 리스너
    socket.on('room:user-joined', () => {
      console.log('[소켓] 새로운 유저 입장!');
      fetchAndUpdateRooms();
    });

    socket.on('room:user-left', () => {
      console.log('[소켓] 기존 유저 퇴장!');
      fetchAndUpdateRooms();
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('room:private-rooms-updated');
      socket.off('room:member-status-changed');
      socket.off('room:user-joined');
      socket.off('room:user-left');
    };
  });

  return { isReady };
}
