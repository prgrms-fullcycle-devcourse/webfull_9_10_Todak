'use client';

import type {
  NotificationsResponse,
  RoomNotification,
} from '@/services/notifications/model';
import {
  notificationQueryKeys,
  useNotifications,
} from '@/services/notifications/query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
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

  // 실시간 알림 소켓 리스너
  useEffect(() => {
    if (!roomID) return;

    const socket = getSocket();

    const roomNotificationEvent = `notification:created:${roomID}`;

    console.log(
      `🔌 [소켓 디버깅] [${roomNotificationEvent}] 채널 구독을 시작합니다.`,
      {
        소켓_ID: socket.id,
        연결_상태: socket.connected,
      },
    );

    // 서버에서 새 알림 발송 시 실행될 콜백 핸들러
    const handleNewNotification = (newNotification: RoomNotification) => {
      console.log(
        `📥 [소켓 디버깅] 우리 방 [${roomID}]의 실시간 알림 패킷 수신 성공!`,
        newNotification,
      );

      queryClient.setQueryData<NotificationsResponse>(
        notificationQueryKeys.room(roomID),
        oldData => {
          if (!oldData) return { notifications: [newNotification] };

          // 최신 알림을 맨 앞에 넣고, 최대 5개까지만 유지하도록 자릅니다.
          const updatedList = [newNotification, ...oldData.notifications].slice(
            0,
            5,
          );
          return { notifications: updatedList };
        },
      );

      setActiveIndex(0);
    };

    // 실시간 이벤트 구독 시작
    socket.on(roomNotificationEvent, handleNewNotification);

    const onConnect = () =>
      console.log('🟢 [소켓 디버깅] 실시간 소켓 재연결 성공:', socket.id);
    const onDisconnect = (reason: string) =>
      console.log('🔴 [소켓 디버깅] 실시간 소켓 연결 끊김:', reason);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // 언마운트 시 해당 룸 전용 채널만 정확하게 클린업 오프(off) 처리
    return () => {
      socket.off(roomNotificationEvent, handleNewNotification);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [roomID, queryClient]);

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
