'use client';

import type { AuthUser } from '@/lib/auth';
import type { RoomProfile } from '@/services/rooms/model';
import { Chip, Dropdown } from '@heroui/react';
import Image from 'next/image';

const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  design: 'Designer',
  pm: 'PM',
};

interface Props {
  myInfo: AuthUser;
  myRoomInfo?: RoomProfile;
}

export default function MyInformation({ myInfo, myRoomInfo }: Props) {
  const displayName = myRoomInfo?.nickname?.trim() || myInfo.login;
  const roles = myRoomInfo?.roles ?? [];
  const hasAvatar = myInfo.avatarUrl.trim() !== '';
  const avatarInitial = displayName.trim().slice(0, 1) || '?';

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
    </section>
  );
}
