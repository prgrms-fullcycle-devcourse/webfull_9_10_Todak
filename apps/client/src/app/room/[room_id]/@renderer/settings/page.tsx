import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import type { AuthUser } from '@/lib/auth';
import type { RoomInfo, RoomMembers } from '@/services/rooms/model';
import Image from 'next/image';
import Link from 'next/link';

import SettingsBackControls from './_components/SettingsBackControls';

const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  design: 'Designer',
  pm: 'PM',
};

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

    throw error;
  }

  const myRoomInfo = roomMembers.members.find(
    member => member.github_username === myInfo.login,
  );
  const displayName = myRoomInfo?.nickname?.trim() || myInfo.login;
  const roleLabel =
    myRoomInfo?.roles.map(role => ROLE_LABELS[role] ?? role).join(', ') ||
    'Role';
  const repoLabel = roomInfo.repo?.full_name ?? '연동된 깃허브 없음';

  return (
    <main className="h-full min-h-0 overflow-y-auto scroll-smooth bg-background px-5 py-6 text-foreground">
      <div className="mx-auto w-full max-w-[760px] space-y-5 pb-10">
        <SettingsBackControls />

        <header className="rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel">
          <p className="todak-section-label text-todak-coral-500">
            ROOM SETTINGS
          </p>
          <h1 className="todak-title mt-2 text-[24px] leading-tight">설정</h1>
          <p className="todak-subcopy mt-2 text-[11px] font-bold leading-5">
            왼쪽 메뉴를 눌러 같은 페이지의 설정 섹션으로 이동하세요.
          </p>
        </header>

        <section
          className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
          id="profile"
        >
          <p className="todak-section-label text-todak-coral-500">PROFILE</p>
          <h2 className="mt-2 text-lg font-black text-foreground">프로필</h2>
          <div className="mt-5 flex items-center gap-3">
            {myInfo.avatarUrl.trim() !== '' ? (
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-surface-secondary">
                <Image
                  alt={`${displayName} 프로필 이미지`}
                  className="object-cover"
                  fill
                  sizes="56px"
                  src={myInfo.avatarUrl}
                />
              </div>
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-base font-black text-muted">
                {displayName.trim().slice(0, 1) || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">
                {displayName}
              </p>
              <p className="mt-0.5 truncate font-todak-mono text-[10px] text-muted">
                @{myInfo.login}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <SettingField label="역할" value={roleLabel} />
            <SettingField
              label="세부 직군"
              value={myRoomInfo?.detailed_role ?? '미설정'}
            />
            <SettingField
              label="캐릭터"
              value={myRoomInfo?.character_type ?? '미설정'}
            />
            <SettingField label="상태" value={myRoomInfo?.status ?? '미설정'} />
          </dl>
        </section>

        <section
          className="scroll-mt-6 rounded-[26px] border border-border/80 bg-surface px-6 py-6 shadow-todak-panel"
          id="project"
        >
          <p className="todak-section-label text-todak-coral-500">PROJECT</p>
          <h2 className="mt-2 text-lg font-black text-foreground">
            프로젝트 설정
          </h2>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <SettingField label="룸 이름" value={roomInfo.name} />
            <SettingField label="연동된 깃허브" value={repoLabel} />
            <SettingField label="초대 코드" value={roomInfo.invite_code} />
            <SettingField
              label="참여 인원"
              value={`${roomInfo.member_count}/${roomInfo.max_members}`}
            />
          </dl>
        </section>

        <Link
          className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-5 text-xs font-black text-background shadow-todak-soft"
          href={`/room/${encodeURIComponent(roomID)}`}
        >
          룸으로 돌아가기
        </Link>
      </div>
    </main>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
      <dt className="text-[10px] font-black text-muted">{label}</dt>
      <dd className="mt-1 truncate text-xs font-black text-foreground">
        {value}
      </dd>
    </div>
  );
}
