import AIGuide from './_components/AIGuide';
import MyInformation from './_components/MyInformation';
import RecentMeetingLogs from './_components/RecentMeetingLogs';
import ViewSelection from './_components/ViewSelection';

import { apiServer } from '@/lib/api.server';
import type { AuthUser } from '@/lib/auth';
import type { MyRooms, RoomMembers } from '@/sevice/rooms/model';

interface SidebarProps {
  params: Promise<{
    room_id: string;
  }>;
}

export default async function Sidebar({ params }: SidebarProps) {
  const roomID = (await params).room_id;
  const [myInfo, myRooms, roomMembers] = await Promise.all([
    apiServer.get<AuthUser>('/users/me'),
    apiServer.get<MyRooms>('/rooms'),
    apiServer.get<RoomMembers>(`/rooms/${roomID}/members`),
  ]);
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
      <RecentMeetingLogs />
      <AIGuide />
    </>
  );
}
