'use client';

import { logoutAuth } from '@/lib/auth';
import type { RoomInfo, RoomProfile } from '@/services/rooms/model';
import { Dropdown } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Props {
  myRoomInfo?: RoomProfile;
  room: RoomInfo;
  roomID: string;
  userID: string;
}

export default function RoomSettingsDropdown({
  myRoomInfo,
  room,
  roomID,
  userID,
}: Props) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const repoLabel = room.repo?.full_name ?? '연동된 깃허브 없음';

  useEffect(() => {
    if (toastMessage === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleInviteCopy = async () => {
    const inviteText = getInviteLink(userID, room.invite_code);

    try {
      await navigator.clipboard.writeText(inviteText);
      setToastMessage('초대코드가 복사되었습니다');
    } catch {
      setToastMessage('초대코드 복사에 실패했습니다');
    }
  };

  const handleLogout = async () => {
    await logoutAuth();
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="flex shrink-0 justify-end pt-3">
      <Dropdown>
        <Dropdown.Trigger
          aria-label="룸 설정"
          className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-base text-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <span aria-hidden>⚙</span>
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="min-w-56 rounded-xl border border-border bg-surface p-1 shadow-todak-panel"
          placement="top"
        >
          <Dropdown.Menu
            aria-label="룸 설정 메뉴"
            onAction={key => {
              if (key === 'settings' && myRoomInfo) {
                router.push(`/room/${encodeURIComponent(roomID)}/settings`);
                return;
              }

              if (key === 'invite') {
                void handleInviteCopy();
                return;
              }

              if (key === 'logout') {
                void handleLogout();
              }
            }}
          >
            <Dropdown.Item
              className="cursor-default"
              id="room-name"
              isDisabled
              textValue={`룸 이름 ${room.name}`}
            >
              <MenuLabel label="룸 이름" value={room.name} />
            </Dropdown.Item>
            <Dropdown.Item
              className="cursor-default"
              id="github-repo"
              isDisabled
              textValue={`연동된 깃허브 ${repoLabel}`}
            >
              <MenuLabel label="연동된 깃허브" value={repoLabel} />
            </Dropdown.Item>
            <Dropdown.Item id="settings" isDisabled={!myRoomInfo}>
              설정
            </Dropdown.Item>
            <Dropdown.Item id="invite">협업자 초대</Dropdown.Item>
            <Dropdown.Item id="logout" variant="danger">
              로그아웃
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {toastMessage !== null && (
        <div className="todak-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function MenuLabel({ label, value }: { label: string; value: string }) {
  return (
    <span className="block min-w-0">
      <span className="block text-[10px] font-black text-muted">{label}</span>
      <span className="mt-0.5 block truncate font-todak-mono text-[10px] font-bold text-foreground">
        {value}
      </span>
    </span>
  );
}

function getInviteLink(userID: string, inviteCode: string) {
  if (typeof window === 'undefined') {
    return inviteCode;
  }

  const url = new URL(
    `/${encodeURIComponent(userID)}/join`,
    window.location.origin,
  );
  url.searchParams.set('inviteCode', inviteCode);

  return url.toString();
}
