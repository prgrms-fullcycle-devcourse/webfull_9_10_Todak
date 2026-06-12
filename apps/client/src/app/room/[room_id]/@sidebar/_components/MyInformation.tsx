'use client';

import type { AuthUser } from '@/lib/auth';
import type { RoomProfile } from '@/services/rooms/model';
import { Button, Chip } from '@heroui/react';
import Image from 'next/image';
import { useState } from 'react';

import LeaveRoomModal from './LeaveRoomModal';

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
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
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
            <p className="min-w-0 truncate text-sm font-black text-foreground">
              {displayName}
            </p>
            <Button
              aria-label="룸 나가기"
              className="size-5 min-w-5 shrink-0 rounded-md p-0 text-muted transition-colors hover:bg-surface-secondary hover:text-red-500"
              isIconOnly
              onPress={() => setIsLeaveModalOpen(true)}
              type="button"
              variant="ghost"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8l4 4-4 4M9 12h9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </Button>
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
      <LeaveRoomModal
        isOpen={isLeaveModalOpen}
        onOpenChange={setIsLeaveModalOpen}
        roomID={roomID}
        userID={myInfo.id}
      />
    </section>
  );
}
