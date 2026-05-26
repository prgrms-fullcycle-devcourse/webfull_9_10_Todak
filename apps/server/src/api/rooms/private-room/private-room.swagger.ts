import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import {
  PrivateRoomInfoSchema,
  EnterPrivateRoomResponseSchema,
  LeavePrivateRoomResponseSchema,
} from './private-room.schema.js';

const privateRoomParams = z.object({
  roomId: z
    .string()
    .uuid()
    .openapi({ description: '룸 ID', example: 'uuid-room-1' }),
  privateRoomId: z
    .string()
    .uuid()
    .openapi({ description: '프라이빗 룸 ID', example: 'uuid-private-room-1' }),
});

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

// ─── GET /rooms/:roomId/private-room ───────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/private-room',
  tags: ['Rooms'],
  summary: '프라이빗 룸 목록 조회',
  description:
    '해당 룸(:roomId)에 있는 2개의 private-room 정보와 현재 입장 중인 참여자 목록을 반환합니다. ' +
    '소켓 이벤트 room:private-rooms-updated 로 실시간 반영됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      roomId: z
        .string()
        .uuid()
        .openapi({ description: '룸 ID', example: 'uuid-room-1' }),
    }),
  },
  responses: {
    200: {
      description: '프라이빗 룸 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.array(PrivateRoomInfoSchema),
          example: [
            {
              id: 'uuid-private-room-1',
              name: '회의실 A',
              is_meeting_active: true,
              current_participants: [
                {
                  user_id: 'uuid-user-1',
                  github_username: 'jiyun-dev',
                  entered_at: '2026-05-26T09:00:00.000Z',
                },
              ],
            },
            {
              id: 'uuid-private-room-2',
              name: '회의실 B',
              is_meeting_active: false,
              current_participants: [],
            },
          ],
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/private-room/:privateRoomId/enter ─────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/private-room/{privateRoomId}/enter',
  tags: ['Rooms'],
  summary: '프라이빗 룸 입장',
  description:
    '프라이빗 룸에 입장합니다. 세션을 생성하고 소켓 이벤트(room:private-rooms-updated)를 트리거합니다. ' +
    '이미 입장 중인 경우 기존 세션 정보를 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: privateRoomParams,
  },
  responses: {
    200: {
      description: '프라이빗 룸 입장 성공',
      content: {
        'application/json': {
          schema: EnterPrivateRoomResponseSchema,
          example: {
            private_room_id: 'uuid-private-room-1',
            user_id: 'uuid-user-1',
            entered_at: '2026-05-18T14:02:00.000Z',
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '프라이빗 룸을 찾을 수 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/private-room/:privateRoomId/leave ─────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/private-room/{privateRoomId}/leave',
  tags: ['Rooms'],
  summary: '프라이빗 룸 퇴장',
  description:
    '프라이빗 룸에서 퇴장합니다. 마지막 멤버 퇴장 시 진행 중인 회의를 자동으로 취소하고 ' +
    'meeting_cancelled: true 를 반환합니다. 소켓 이벤트(room:private-rooms-updated)를 트리거합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: privateRoomParams,
  },
  responses: {
    200: {
      description: '프라이빗 룸 퇴장 성공',
      content: {
        'application/json': {
          schema: LeavePrivateRoomResponseSchema,
          examples: {
            normal: {
              summary: '일반 퇴장',
              value: {
                private_room_id: 'uuid-private-room-1',
                user_id: 'uuid-user-1',
                left_at: '2026-05-18T14:30:00.000Z',
                meeting_cancelled: false,
              },
            },
            lastMember: {
              summary: '마지막 멤버 퇴장 → 회의 자동 취소',
              value: {
                private_room_id: 'uuid-private-room-1',
                user_id: 'uuid-user-1',
                left_at: '2026-05-18T14:30:00.000Z',
                meeting_cancelled: true,
              },
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '프라이빗 룸을 찾을 수 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});
