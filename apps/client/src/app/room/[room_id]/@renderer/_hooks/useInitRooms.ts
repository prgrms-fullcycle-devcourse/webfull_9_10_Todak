import { useEffect, useState } from 'react';
import { AnimalType, useSpaceStore } from '@/store/useSpaceStore';
import { useRoomUiStore } from '@/store/useRoomUiStore';
import { STATIC_ROOM_BOUNDS } from '../_constants/roomBounds';
import { useSocket } from '@/providers/SocketProvider';
import {
  fetchMyProfile,
  fetchPrivateRooms,
  fetchRoomMembers,
} from '@/services/rooms/api';
import { type PrivateRoom } from '@/services/rooms/model';
import { getStoredAuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const STATUS_TO_LABEL_MAP: Record<string, string> = {
  focus: '🔥 집중',
  rest: '☕ 휴식',
  meeting: '💬 회의중',
  away: '💤 부재',
};

export function useInitRooms(roomId: string) {
  const router = useRouter();
  const { socket } = useSocket();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const fetchAndUpdateRooms = async (): Promise<boolean> => {
      try {
        const [roomResponse, memberResponse, myInfoResponse] =
          await Promise.all([
            fetchPrivateRooms(roomId),
            fetchRoomMembers(roomId),
            fetchMyProfile(),
          ]);

        const memberList = memberResponse?.members || [];

        if (myInfoResponse && memberList.length > 0) {
          const myRoomProfile = memberList.find(
            member => member.github_username === myInfoResponse.login,
          );

          if (myRoomProfile) {
            const existingMyChar = useSpaceStore.getState().myChar;
            if (!existingMyChar || !existingMyChar.id) {
              const initialDbStatus =
                STATUS_TO_LABEL_MAP[myRoomProfile.status] ||
                myRoomProfile.status ||
                '🔥 집중';

              useSpaceStore.getState().setMyChar({
                id: myInfoResponse.id,
                name: myRoomProfile.nickname ?? '로딩 중...',
                githubUsername: myInfoResponse.login,
                avatarId: (myRoomProfile.character_type ??
                  'rabbit') as AnimalType,
                status: initialDbStatus,
              });
            }
          } else {
            alert(
              '프로필 설정이 완료되지 않은 유저입니다. 설정 페이지로 이동합니다.',
            );
            setIsReady(false);
            router.replace(`/room/${roomId}/setup`);
            return false;
          }
        }

        // --- 멤버 상태 동기화 로직 ---
        const currentMembers = useSpaceStore.getState().members; // 현재 내 화면의 맴버들

        const mergedMembers = memberList.map(apiMember => {
          // 이미 내 화면에 존재하던 팀원인지 확인
          const existingMember = currentMembers.find(
            m => m.id === apiMember.id,
          );

          if (existingMember) {
            return {
              ...apiMember,
              status: existingMember.status,
              pos_x: existingMember.pos_x,
              pos_y: existingMember.pos_y,
            };
          }
          return apiMember;
        });

        useSpaceStore.getState().setMembers(mergedMembers);

        // --- 회의실 매핑 로직 ---
        const response = roomResponse as unknown;
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

        // DB에서 리턴되는 배열 순서를 ID 기준으로 고정 정렬
        const sortedRooms = [...fetchedRooms].sort((a, b) =>
          a.id.localeCompare(b.id),
        );

        const dynamicConfig = STATIC_ROOM_BOUNDS.map((bounds, idx) => {
          const apiRoom = sortedRooms[idx];
          return {
            id: apiRoom ? apiRoom.id : `empty-room-${idx}`,
            name: apiRoom ? apiRoom.name : `미지정 회의실`,
            bounds: bounds,
            isActive: apiRoom ? apiRoom.is_meeting_active : false,
            color: 0xffffff,
          };
        });

        window.DYNAMIC_ROOMS_CONFIG = dynamicConfig;
        useSpaceStore.getState().setPrivateRooms(sortedRooms);
        return true;
      } catch (error) {
        console.error('회의실 데이터 새로고침 실패:', error);
        return false;
      }
    };

    const initialize = async () => {
      const isSuccess = await fetchAndUpdateRooms();
      if (isSuccess) {
        setIsReady(true);
      }
    };

    initialize();

    const handleConnectError = (error: Error) => {
      console.error('소켓 연결 실패 :', error.message);
    };

    const handlePrivateRoomsUpdated = () => {
      fetchAndUpdateRooms();
    };

    const handleMemberStatusChanged = (data: {
      userId: string;
      status: string;
    }) => {
      const hangulStatus = STATUS_TO_LABEL_MAP[data.status] || data.status;

      const authUser = getStoredAuthUser();

      if (authUser && data.userId === authUser.id) {
        useSpaceStore.getState().setMyStatus(hangulStatus);
      }

      const { members, setMembers } = useSpaceStore.getState();
      const updatedMembers = members.map(member =>
        member.id === data.userId ? { ...member, status: data.status } : member,
      );

      // 전역 스토어에 업데이트된 배열 저장
      setMembers(updatedMembers);
    };

    const handleMeetingStarted = ({ meetingId }: { meetingId: string }) => {
      useSpaceStore.getState().setCurrentMeetingId(meetingId);
    };

    const handleMeetingEnded = () => {
      useSpaceStore.getState().setCurrentMeetingId(null);
    };

    const handleMinutesGenerationStarted = ({
      minutes_id,
    }: {
      minutes_id: string;
    }) => {
      useRoomUiStore.getState().setCurrentMinutesId(minutes_id);
    };

    const handleMinutesGenerated = ({ minutes_id }: { minutes_id: string }) => {
      useRoomUiStore.getState().setCurrentMinutesId(minutes_id);
    };

    const handleMinutesGenerationFailed = () => {
      console.error('AI 회의록 생성 실패');
    };

    socket.on('connect_error', handleConnectError);
    socket.on('room:private-rooms-updated', handlePrivateRoomsUpdated);
    socket.on('room:member-status-changed', handleMemberStatusChanged);
    socket.on('meeting:started', handleMeetingStarted);
    socket.on('meeting:ended', handleMeetingEnded);
    socket.on('minutes:generation-started', handleMinutesGenerationStarted);
    socket.on('minutes:generated', handleMinutesGenerated);
    socket.on('minutes:generation-failed', handleMinutesGenerationFailed);

    // 컴포넌트 언마운트 시 자신이 등록한 리스너만 해제
    return () => {
      socket.off('connect_error', handleConnectError);
      socket.off('room:private-rooms-updated', handlePrivateRoomsUpdated);
      socket.off('room:member-status-changed', handleMemberStatusChanged);
      socket.off('meeting:started', handleMeetingStarted);
      socket.off('meeting:ended', handleMeetingEnded);
      socket.off('minutes:generation-started', handleMinutesGenerationStarted);
      socket.off('minutes:generated', handleMinutesGenerated);
      socket.off('minutes:generation-failed', handleMinutesGenerationFailed);
    };
  }, [roomId, router, socket]);

  return { isReady };
}
