import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';
import { RoomIdParamsSchema } from '../private-room/private-room.schema.js';

import {
  EndMeetingResponseSchema,
  MeetingChatSchema,
  MeetingChatsQuerySchema,
  MeetingParamsSchema,
  MeetingSchema,
  StartMeetingResponseSchema,
  StartMeetingSchema,
} from './meetings.schema.js';

const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false),
        error: z.string(),
        code: z.string(),
      }),
      example: { success: false, error: message, code },
    },
  },
});

const meetingListExample = [
  {
    id: 'uuid-meeting-1',
    status: 'ended',
    started_at: '2026-05-18T14:02:00.000Z',
    ended_at: '2026-05-18T14:32:00.000Z',
    participant_count: 3,
    message_count: 22,
    minutes_id: 'uuid-minutes-1',
  },
];

const meetingChatsExample = [
  {
    id: 'uuid-chat-1',
    user: {
      github_username: 'jiyun-dev',
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
    content: '채팅 컴포넌트 PR 리뷰 반영 다 됐어요',
    type: 'text',
    created_at: '2026-05-18T14:05:00.000Z',
  },
];

// ─── GET /rooms/:roomId/meetings ───────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/meetings',
  tags: ['Meetings'],
  summary: '회의 목록 조회',
  description:
    '룸에서 진행했던 회의 목록을 최신순으로 반환합니다. ' +
    'participant_count / message_count 는 회의 구간 채팅을 기준으로 계산됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
  },
  responses: {
    200: {
      description: '회의 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.array(MeetingSchema),
          example: meetingListExample,
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음 (또는 멤버 아님)',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/meetings ──────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/meetings',
  tags: ['Meetings'],
  summary: '회의 시작',
  description:
    '프라이빗 룸 내 버튼 클릭 시 회의를 시작합니다. ' +
    '같은 프라이빗 룸에 이미 진행 중인 회의가 있으면 새로 만들지 않고 해당 회의를 반환합니다(멱등).',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    body: {
      content: {
        'application/json': { schema: StartMeetingSchema },
      },
    },
  },
  responses: {
    201: {
      description: '회의 시작 성공',
      content: {
        'application/json': {
          schema: StartMeetingResponseSchema,
          example: {
            id: 'uuid-meeting-1',
            status: 'ongoing',
            started_at: '2026-05-18T14:02:00.000Z',
            host_id: 'uuid-user-1',
            participants: ['uuid-user-1', 'uuid-user-2'],
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '프라이빗 룸을 찾을 수 없음',
      'PRIVATE_ROOM_NOT_FOUND',
      '프라이빗 룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/meetings/:meetingId/end ───────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/meetings/{meetingId}/end',
  tags: ['Meetings'],
  summary: '회의 종료',
  description:
    '회의를 종료합니다(룸 멤버 누구나). 회의 구간에 채팅을 남긴 사람을 참여자로 기록하고 메시지 수를 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MeetingParamsSchema,
  },
  responses: {
    200: {
      description: '회의 종료 성공',
      content: {
        'application/json': {
          schema: EndMeetingResponseSchema,
          example: {
            id: 'uuid-meeting-1',
            status: 'ended',
            ended_at: '2026-05-18T14:32:00.000Z',
            message_count: 22,
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '회의를 찾을 수 없음',
      'MEETING_NOT_FOUND',
      '해당 회의(Meeting) 정보를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/meetings/:meetingId/chats ──────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/meetings/{meetingId}/chats',
  tags: ['Meetings'],
  summary: '특정 회의 구간 채팅 추출',
  description:
    '회의 started_at ~ ended_at 구간의 일반 채팅을 시간순으로 반환합니다. 회의록 자동 생성 시 사용합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MeetingParamsSchema,
    query: MeetingChatsQuerySchema,
  },
  responses: {
    200: {
      description: '회의 구간 채팅 조회 성공',
      content: {
        'application/json': {
          schema: z.array(MeetingChatSchema),
          example: meetingChatsExample,
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '회의를 찾을 수 없음',
      'MEETING_NOT_FOUND',
      '해당 회의(Meeting) 정보를 찾을 수 없습니다.',
    ),
  },
});
