'use client';

import type {
  RoomNotification,
  SocketPrPayload,
  SocketReviewPayload,
  SocketIssuePayload,
} from '@/services/notifications/model';
import {
  notificationQueryKeys,
  useNotifications,
} from '@/services/notifications/query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useQueryClient } from '@tanstack/react-query';

function getNotificationLabel(type: RoomNotification['type']) {
  switch (type) {
    case 'pr_opened':
      return 'PR OPENED';
    case 'pr_merged':
      return 'PR MERGED';
    case 'pr_reviewed':
      return 'PR REVIEWED';
    case 'new_issue':
      return 'NEW ISSUE';
    case 'minutes_generated':
      return 'MINUTES';
    case 'minutes_generation_failed':
      return 'MINUTES FAILED';
    case 'meeting_started':
      return 'MEETING START';
    case 'minutes_confirmed':
      return 'MINUTES DONE';
    default:
      return 'GITHUB NEWS';
  }
}

export default function RollingNotificationBanner() {
  const { room_id: roomID } = useParams<{ room_id: string }>();
  const [activeIndex, setActiveIndex] = useState(0);

  const queryClient = useQueryClient();

  const { data, isError, isPending } = useNotifications(roomID);

  const notifications = data?.notifications ?? [];
  const activeNotification =
    notifications.length > 0
      ? notifications[activeIndex % notifications.length]
      : undefined;

  const refreshNotifications = () => {
    queryClient.invalidateQueries({
      queryKey: notificationQueryKeys.room(roomID),
    });
    setActiveIndex(0);
  };

  useSocketEvent<[RoomNotification]>(
    'notification:created',
    incomingData => {
      if (incomingData.room_id === roomID) {
        refreshNotifications();
      }
    },
    { enabled: Boolean(roomID) },
  );
  useSocketEvent<[SocketPrPayload]>(
    'pr:opened',
    incomingData => {
      if (incomingData.roomId === roomID) {
        refreshNotifications();
      }
    },
    { enabled: Boolean(roomID) },
  );
  useSocketEvent<[SocketPrPayload]>(
    'pr:merged',
    incomingData => {
      if (incomingData.roomId === roomID) {
        refreshNotifications();
      }
    },
    { enabled: Boolean(roomID) },
  );
  useSocketEvent<[SocketReviewPayload]>(
    'pr:reviewed',
    incomingData => {
      if (incomingData.roomId === roomID) {
        refreshNotifications();
      }
    },
    { enabled: Boolean(roomID) },
  );
  useSocketEvent<[SocketIssuePayload]>(
    'issue:created',
    incomingData => {
      if (incomingData.roomId === roomID) {
        refreshNotifications();
      }
    },
    { enabled: Boolean(roomID) },
  );

  useEffect(() => {
    if (notifications.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % notifications.length);
    }, 4_000);

    return () => window.clearInterval(intervalId);
  }, [notifications.length]);

  const notificationLabel = activeNotification
    ? getNotificationLabel(activeNotification.type)
    : 'GITHUB NEWS';
  const label = activeNotification?.is_sample
    ? `SAMPLE | ${notificationLabel}`
    : notificationLabel;
  let message = activeNotification?.message ?? '새로운 GitHub 알림이 없습니다.';
  let statusText = activeNotification?.is_sample
    ? '샘플 알림 표시 중'
    : '이슈 실시간 싱크 활성';

  if (isPending) {
    message = 'GitHub 알림을 불러오는 중입니다...';
    statusText = '알림 싱크 중';
  }

  if (isError) {
    message = 'GitHub 알림을 불러오지 못했습니다.';
    statusText = '알림 싱크 확인 필요';
  }

  const rollingItemKey =
    activeNotification?.id ?? `${roomID}-${label}-${statusText}`;

  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="rounded-lg bg-accent px-3 py-1.5 font-todak-mono text-[11px] font-black text-accent-foreground">
          {label}
        </span>
        <div aria-live="polite" className="notification-roll-window">
          {activeNotification?.link ? (
            <a
              className="notification-roll-item underline-offset-2 hover:underline"
              href={activeNotification.link}
              key={rollingItemKey}
              rel="noreferrer"
              target="_blank"
            >
              {message}
            </a>
          ) : (
            <span className="notification-roll-item" key={rollingItemKey}>
              {message}
            </span>
          )}
        </div>
      </div>
      <span className="font-todak-mono text-[10px] text-slate-400">
        {statusText}
      </span>
    </>
  );
}
