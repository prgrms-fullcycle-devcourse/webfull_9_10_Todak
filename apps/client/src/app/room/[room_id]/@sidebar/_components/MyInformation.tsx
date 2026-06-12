'use client';

import type { AuthUser } from '@/lib/auth';
import { logoutAuth } from '@/lib/auth';
import type { RoomProfile } from '@/services/rooms/model';
import { Chip, Dropdown } from '@heroui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ProfileEditModal from './ProfileEditModal';

const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  design: 'Designer',
  pm: 'PM',
};

interface Props {
  myInfo: AuthUser;
  myRoomInfo?: RoomProfile;
  roomID: string;
}

export default function MyInformation({ myInfo, myRoomInfo, roomID }: Props) {
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const displayName = myRoomInfo?.nickname?.trim() || myInfo.login;
  const roles = myRoomInfo?.roles ?? [];
  const hasAvatar = myInfo.avatarUrl.trim() !== '';
  const avatarInitial = displayName.trim().slice(0, 1) || '?';

  const handleLogout = async () => {
    await logoutAuth();
    router.replace('/');
    router.refresh();
  };

  return (
    <section className="shrink-0">
      <div className="flex items-center gap-2.5">
        {hasAvatar ? (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-surface-secondary">
            <Image
              alt={`${displayName} 프로필 이미지`}
              className="object-cover"
              fill
              sizes="36px"
              src={myInfo.avatarUrl}
            />
          </div>
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-black text-muted">
            {avatarInitial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-black text-foreground">
              {displayName}
            </p>
          </div>
          <p className="mt-0.5 truncate font-todak-mono text-[8px] text-muted">
            @{myInfo.login}
          </p>
        </div>
        <Dropdown>
          <Dropdown.Trigger className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-black text-muted shadow-sm transition-colors hover:bg-surface-secondary">
            수정하기
          </Dropdown.Trigger>
          <Dropdown.Popover
            className="min-w-36 rounded-xl border border-border bg-surface p-1 shadow-todak-panel"
            placement="right"
          >
            <Dropdown.Menu
              aria-label="내 프로필 메뉴"
              onAction={key => {
                if (key === 'edit-profile' && myRoomInfo) {
                  setIsProfileModalOpen(true);
                  return;
                }

                if (key === 'logout') {
                  void handleLogout();
                }
              }}
            >
              <Dropdown.Item id="edit-profile" isDisabled={!myRoomInfo}>
                프로필 수정하기
              </Dropdown.Item>
              <Dropdown.Item id="logout" variant="danger">
                로그아웃
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(roles.length > 0 ? roles : ['Role']).map(role => (
          <Chip
            className="h-5 rounded-md bg-accent/10 px-1.5 font-todak-mono text-[8px] font-black text-accent"
            key={role}
            size="sm"
            variant="soft"
          >
            {ROLE_LABELS[role] ?? role}
          </Chip>
        ))}
      </div>
      {myRoomInfo && isProfileModalOpen && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          myRoomInfo={myRoomInfo}
          onOpenChange={setIsProfileModalOpen}
          roomID={roomID}
        />
      )}
    </section>
  );
}
