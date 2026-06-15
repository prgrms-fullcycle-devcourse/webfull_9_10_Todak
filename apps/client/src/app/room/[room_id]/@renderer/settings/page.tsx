import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import {
  apiServer,
  isApiServerAuthError,
  isApiServerNotFoundError,
} from '@/lib/api.server';
import type { AuthUser } from '@/lib/auth';
import type { RoomInfo, RoomMembers } from '@/services/rooms/model';
import { notFound } from 'next/navigation';

import ProfileSettingsForm from './_components/ProfileSettingsForm';
import ProjectSettingsForm from './_components/ProjectSettingsForm';

interface RoomSettingsPageProps {
  params: Promise<{
    room_id: string;
  }>;
}

export default async function RoomSettingsPage({
  params,
}: RoomSettingsPageProps) {
  const { room_id: roomID } = await params;
  let myInfo: AuthUser;
  let roomInfo: RoomInfo;
  let roomMembers: RoomMembers;

  try {
    [myInfo, roomInfo, roomMembers] = await Promise.all([
      apiServer.get<AuthUser>('/users/me'),
      apiServer.get<RoomInfo>(`/rooms/${roomID}`),
      apiServer.get<RoomMembers>(`/rooms/${roomID}/members`),
    ]);
  } catch (error) {
    if (isApiServerAuthError(error)) {
      return (
        <main className="flex h-full min-h-0 items-center justify-center bg-background px-5 text-foreground">
          <AuthRefreshOnMount />
          <p className="text-xs font-black text-muted">
            인증 정보를 새로고침하고 있습니다.
          </p>
        </main>
      );
    }

    if (isApiServerNotFoundError(error)) {
      notFound();
    }

    throw error;
  }

  const myRoomInfo = roomMembers.members.find(
    member => member.github_username === myInfo.login,
  );

  return (
    <main className="h-full min-h-0 overflow-y-auto scroll-smooth bg-background px-5 py-6 text-foreground">
      <div className="mx-auto w-full max-w-[760px] space-y-5 pb-10">
        <header className="rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel">
          <p className="todak-section-label text-todak-coral-500">
            ROOM SETTINGS
          </p>
          <h1 className="todak-title mt-2 text-[24px] leading-tight">설정</h1>
          <p className="todak-subcopy mt-2 text-[11px] font-bold leading-5">
            왼쪽 메뉴를 눌러 같은 페이지의 설정 섹션으로 이동하세요.
          </p>
        </header>

        <ProfileSettingsForm myRoomInfo={myRoomInfo} roomID={roomID} />
        <ProjectSettingsForm
          myRoomInfo={myRoomInfo}
          room={roomInfo}
          roomID={roomID}
          userID={myInfo.id}
        />
      </div>
    </main>
  );
}
