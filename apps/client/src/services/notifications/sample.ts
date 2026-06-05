import type { RoomNotification } from './model';

const SAMPLE_NOTIFICATION_ITEMS: Array<Omit<RoomNotification, 'room_id'>> = [
  {
    id: 'sample-notification-new-issue-auth-token',
    type: 'new_issue',
    message:
      '[샘플] GitHub Issue #128: 로그인 토큰 갱신 오류 수정이 생성되었습니다.',
    link: null,
    is_read: false,
    created_at: '2026-06-05T09:00:00.000Z',
    is_sample: true,
  },
  {
    id: 'sample-notification-pr-opened-banner-hook',
    type: 'pr_opened',
    message: '[샘플] PR #42: 알림 배너 공통 훅 분리 작업이 열렸습니다.',
    link: null,
    is_read: false,
    created_at: '2026-06-05T08:40:00.000Z',
    is_sample: true,
  },
  {
    id: 'sample-notification-pr-merged-minutes-sync',
    type: 'pr_merged',
    message: '[샘플] PR #39: 회의록 액션 아이템 동기화가 머지되었습니다.',
    link: null,
    is_read: true,
    created_at: '2026-06-05T08:10:00.000Z',
    is_sample: true,
  },
  {
    id: 'sample-notification-minutes-generated',
    type: 'minutes_generated',
    message: '[샘플] AI 회의록 생성이 완료되어 Todo 후보 3개가 준비되었습니다.',
    link: null,
    is_read: false,
    created_at: '2026-06-05T07:45:00.000Z',
    is_sample: true,
  },
  {
    id: 'sample-notification-new-issue-mobile-chat',
    type: 'new_issue',
    message:
      '[샘플] GitHub Issue #127: 모바일 채팅 패널 레이아웃 점검이 생성되었습니다.',
    link: null,
    is_read: true,
    created_at: '2026-06-05T07:20:00.000Z',
    is_sample: true,
  },
];

export function getSampleNotifications(roomID: string): RoomNotification[] {
  return SAMPLE_NOTIFICATION_ITEMS.map(notification => ({
    ...notification,
    room_id: roomID,
  }));
}
