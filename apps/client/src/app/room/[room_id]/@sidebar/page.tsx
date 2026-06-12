import AIGuide from './_components/AIGuide';
import MyInformation from './_components/MyInformation';
import RecentMeetingLogs from './_components/RecentMeetingLogs';
import RoomSettingsDropdown from './_components/RoomSettingsDropdown';
import ViewSelection from './_components/ViewSelection';

import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import type { AuthUser } from '@/lib/auth';
import type { MinutesList } from '@/services/minutes/model';
import type { RoomInfo, RoomMembers } from '@/services/rooms/model';
import { Accordion, Separator } from '@heroui/react';
import PullRequestNotifications from './_components/PullRequestNotifications';

interface SidebarProps {
  params: Promise<{
    room_id: string;
  }>;
}

export default async function Sidebar({ params }: SidebarProps) {
  const roomID = (await params).room_id;
  const minutesSearchParams = new URLSearchParams({
    type: 'meeting',
    page: '1',
    limit: '5',
  });
  let myInfo: AuthUser;
  let roomInfo: RoomInfo;
  let roomMembers: RoomMembers;
  let meetingLogs: MinutesList;

  try {
    [myInfo, roomInfo, roomMembers, meetingLogs] = await Promise.all([
      apiServer.get<AuthUser>('/users/me'),
      apiServer.get<RoomInfo>(`/rooms/${roomID}`),
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

  const myRoomInfo = roomMembers.members.find(
    member => member.github_username === myInfo.login,
  );

  return (
    <>
      <MyInformation myInfo={myInfo} myRoomInfo={myRoomInfo} />
      <Separator className="my-3 bg-border" />
      <ViewSelection />
      <Separator className="my-3 bg-border" />
      <Accordion
        allowsMultipleExpanded
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        defaultExpandedKeys={[]}
      >
        <RecentMeetingLogs meetingLogs={meetingLogs.minutes} />
        <PullRequestNotifications />
      </Accordion>
      <RoomSettingsDropdown
        myRoomInfo={myRoomInfo}
        room={roomInfo}
        roomID={roomID}
        userID={myInfo.id}
      />
    </>
  );
}

function SidebarFallback() {
  return (
    <>
      <AuthRefreshOnMount />

      <Separator className="my-3 bg-border" />
      <ViewSelection />
      <Separator className="my-3 bg-border" />
      <Accordion
        allowsMultipleExpanded
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        defaultExpandedKeys={[]}
      >
        <RecentMeetingLogs meetingLogs={[]} />
        <AIGuide />
      </Accordion>
    </>
  );
}
