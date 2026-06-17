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

    // 싱글톤 소켓 버그 방지 기명 핸들러 정의
    const handleNotificationCreated = (incomingData: RoomNotification) => {
      if (incomingData.room_id !== roomID) return;

      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomID),
      });
      setActiveIndex(0);
    };

    // PR 오픈/머지 룸 공용 핸들러
    const handlePrRoomEvent = (incomingData: SocketPrPayload) => {
      if (incomingData.roomId !== roomID) return;

      // 소켓 신호 감지 시 즉시 변경
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomID),
      });
      setActiveIndex(0);
    };

    // PR 리뷰 룸 공용 핸들러
    const handleReviewRoomEvent = (incomingData: SocketReviewPayload) => {
      if (incomingData.roomId !== roomID) return;

      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomID),
      });
      setActiveIndex(0);
    };

    // 이슈 생성 공용 핸들러
    const handleIssueRoomEvent = (incomingData: SocketIssuePayload) => {
      if (incomingData.roomId !== roomID) return;
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.room(roomID),
      });
      setActiveIndex(0);
    };

    // 통합 주파수 수신 대기 모드 ON
    socket.on('notification:created', handleNotificationCreated);
    socket.on('pr:opened', handlePrRoomEvent);
    socket.on('pr:merged', handlePrRoomEvent);
    socket.on('pr:reviewed', handleReviewRoomEvent);
    socket.on('issue:created', handleIssueRoomEvent);

    return () => {
      // 리스너 클린업
      socket.off('notification:created', handleNotificationCreated);
      socket.off('pr:opened', handlePrRoomEvent);
      socket.off('pr:merged', handlePrRoomEvent);
      socket.off('pr:reviewed', handleReviewRoomEvent);
      socket.off('issue:created', handleIssueRoomEvent);
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
