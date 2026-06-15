'use client';

import { logoutAuth } from '@/lib/auth';
import type { RoomInfo, RoomProfile } from '@/services/rooms/model';
import { Button, Dropdown } from '@heroui/react';
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
  const isHost = myRoomInfo?.is_host === true;

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
    try {
      await navigator.clipboard.writeText(room.invite_code);
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
    <div className="flex shrink-0 items-center justify-between pt-3">
      <Button
        aria-label="프로젝트 허브로 이동"
        className="flex size-9 min-w-9 items-center justify-center rounded-full border border-border bg-surface p-0 text-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-accent"
        isIconOnly
        onPress={() => router.push(`/${encodeURIComponent(userID)}/join`)}
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
            d="M14 5h3.2A1.8 1.8 0 0 1 19 6.8v10.4a1.8 1.8 0 0 1-1.8 1.8H14M9.5 8l-4 4 4 4M15 12H6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </Button>

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
          <div className="space-y-2 border-b border-border px-2.5 py-2.5">
            <MenuLabel label="룸 이름" value={room.name} />
            {isHost && <MenuLabel label="연동된 깃허브" value={repoLabel} />}
            <div className="min-w-0">
              <span className="block text-[10px] font-black text-muted">
                초대코드
              </span>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-todak-mono text-[10px] font-bold text-foreground">
                  {room.invite_code}
                </span>
                <Button
                  aria-label="초대코드 복사"
                  className="size-7 rounded-lg border border-border bg-surface-secondary px-0 text-[11px] font-black text-muted shadow-sm transition-colors hover:bg-background hover:text-foreground"
                  onPress={handleInviteCopy}
                  type="button"
                >
                  ⧉
                </Button>
              </div>
            </div>
          </div>
          <Dropdown.Menu
            aria-label="룸 설정 메뉴"
            onAction={key => {
              if (key === 'settings' && myRoomInfo) {
                router.push(`/room/${encodeURIComponent(roomID)}/settings`);
                return;
              }

              if (key === 'logout') {
                void handleLogout();
              }
            }}
          >
            <Dropdown.Item id="settings" isDisabled={!myRoomInfo}>
              설정
            </Dropdown.Item>
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
