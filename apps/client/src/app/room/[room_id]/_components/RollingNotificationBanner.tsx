'use client';

import { fetchNotifications } from '@/sevice/notifications/api';
import type { RoomNotification } from '@/sevice/notifications/model';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function getNotificationLabel(type: RoomNotification['type']) {
  switch (type) {
    case 'pr_opened':
      return 'PR OPENED';
    case 'pr_merged':
      return 'PR MERGED';
    case 'minutes_generated':
      return 'MINUTES';
    case 'new_issue':
      return 'NEW ISSUE';
    default:
      return 'GITHUB NEWS';
  }
}

export default function RollingNotificationBanner() {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isError, isPending } = useQuery({
    queryKey: ['notifications', roomID],
    queryFn: () => fetchNotifications(roomID),
    enabled: roomID !== '',
    refetchInterval: 30_000,
  });

  const notifications = data?.notifications ?? [];
  const activeNotification =
    notifications.length > 0
      ? notifications[activeIndex % notifications.length]
      : undefined;

  useEffect(() => {
    if (notifications.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % notifications.length);
    }, 4_000);

    return () => window.clearInterval(intervalId);
  }, [notifications.length]);

  const label = activeNotification
    ? getNotificationLabel(activeNotification.type)
    : 'GITHUB NEWS';
  let message = activeNotification?.message ?? '새로운 GitHub 알림이 없습니다.';
  let statusText = '이슈 실시간 싱크 활성';

  if (isPending) {
    message = 'GitHub 알림을 불러오는 중입니다...';
    statusText = '알림 싱크 중';
  }

  if (isError) {
    message = 'GitHub 알림을 불러오지 못했습니다.';
    statusText = '알림 싱크 확인 필요';
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="rounded-lg bg-accent px-3 py-1.5 font-todak-mono text-[11px] font-black text-accent-foreground">
          {label}
        </span>
        {activeNotification?.link ? (
          <a
            className="truncate text-xs font-semibold underline-offset-2 hover:underline"
            href={activeNotification.link}
            rel="noreferrer"
            target="_blank"
          >
            {message}
          </a>
        ) : (
          <p className="truncate text-xs font-semibold">{message}</p>
        )}
      </div>
      <span className="font-todak-mono text-[10px] text-slate-400">
        {statusText}
      </span>
    </>
  );
}
