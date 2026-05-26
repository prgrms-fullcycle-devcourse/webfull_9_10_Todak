import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import { PrivateRoomInfoSchema } from './private-room.schema.js';

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
    401: {
      description: '인증 실패',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(false),
            error: z.string(),
            code: z.string(),
          }),
          example: {
            success: false,
            error: '인증이 필요합니다.',
            code: 'UNAUTHORIZED',
          },
        },
      },
    },
    404: {
      description: '룸을 찾을 수 없음',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(false),
            error: z.string(),
            code: z.string(),
          }),
          example: {
            success: false,
            error: '요청한 리소스를 찾을 수 없습니다.',
            code: 'NOT_FOUND',
          },
        },
      },
    },
  },
});
