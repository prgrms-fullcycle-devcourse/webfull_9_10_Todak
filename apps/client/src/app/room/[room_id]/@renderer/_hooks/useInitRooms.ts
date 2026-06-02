import { useEffect, useState } from 'react';
import { useSpaceStore } from '@/store/useSpaceStore';
import { STATIC_ROOM_BOUNDS } from '../_constants/roomBounds';
import { getSocket } from '@/lib/socket';
import { fetchPrivateRooms } from '@/sevice/rooms/api';
import { type PrivateRoom } from '@/sevice/rooms/model';
import { getStoredAuthUser } from '@/lib/auth';

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

    const STATUS_TO_LABEL_MAP: Record<string, string> = {
      focus: '🔥 집중',
      rest: '☕ 휴식',
      meeting: '💬 회의중',
      away: '💤 부재',
    };

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
        joinRoom();
      });
    }

    // 모두에게 오는 이벤트 리스너
    socket.on('room:private-rooms-updated', () => {
      fetchAndUpdateRooms();
    });

    socket.on(
      'room:member-status-changed',
      (data: { userId: string; status: string }) => {
        const hangulStatus = STATUS_TO_LABEL_MAP[data.status] || data.status;
        console.log(
          `[소켓] 👤 유저(${data.userId})님의 상태가 [${hangulStatus}]로 변경됨`,
        );

        const authUser = getStoredAuthUser();

        fetchAndUpdateRooms();

        if (authUser && data.userId === authUser.id) {
          useSpaceStore.getState().setMyStatus(hangulStatus);
        }
      },
    );

    // 나 이외의 다른 유저에게만 오는 이벤트 리스너
    socket.on('room:user-joined', () => {
      fetchAndUpdateRooms();
    });

    socket.on('room:user-left', () => {
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
