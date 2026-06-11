import AIGuide from './_components/AIGuide';
import MyInformation from './_components/MyInformation';
import RecentMeetingLogs from './_components/RecentMeetingLogs';
import ViewSelection from './_components/ViewSelection';

import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import type { AuthUser } from '@/lib/auth';
import type { MinutesList } from '@/services/minutes/model';
import type { MyRooms, RoomMembers } from '@/services/rooms/model';

interface SidebarProps {
  searchParams: Promise<{
    room_id: string;
  }>;
}

export default async function Sidebar({ searchParams }: SidebarProps) {
  const roomID = (await searchParams).room_id;
  const minutesSearchParams = new URLSearchParams({
    type: 'meeting',
    page: '1',
    limit: '5',
  });
  let myInfo: AuthUser;
  let myRooms: MyRooms;
  let roomMembers: RoomMembers;
  let meetingLogs: MinutesList;

  try {
    [myInfo, myRooms, roomMembers, meetingLogs] = await Promise.all([
      apiServer.get<AuthUser>('/users/me'),
      apiServer.get<MyRooms>('/rooms'),
      apiServer.get<RoomMembers>(`/rooms/${roomID}/members`),
      apiServer.get<MinutesList>(
        `/rooms/${roomID}/minutes?${minutesSearchParams.toString()}`,
      ),
    ]);
  } catch (error) {
    if (isApiServerAuthError(error)) {
      return <SidebarFallback />;
    }

    throw error;
  }

  const currentRoom = myRooms.find(room => room.id === roomID);
  const myRoomProfile = roomMembers.members.find(
    member => member.github_username === myInfo.login,
  );

  return (
    <>
      <MyInformation
        characterType={myRoomProfile?.character_type ?? null}
        name={myRoomProfile?.nickname ?? myInfo.login}
        repoName={currentRoom?.repo?.full_name ?? null}
        roles={myRoomProfile?.roles ?? []}
      />
      <ViewSelection />
      <RecentMeetingLogs meetingLogs={meetingLogs.minutes} />
      <AIGuide />
    </>
  );
}

function SidebarFallback() {
  return (
    <>
      <AuthRefreshOnMount />
      <MyInformation
        characterType={null}
        name="로그인 확인 중"
        repoName={null}
        roles={[]}
      />
      <ViewSelection />
      <RecentMeetingLogs meetingLogs={[]} />
      <AIGuide />
    </>
  );
}
