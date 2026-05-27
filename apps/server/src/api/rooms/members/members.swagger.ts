import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import {
  RoomIdParamsSchema,
  RoomMemberResponseSchema,
  SetupRoomMemberSchema,
} from './members.schema.js';

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

// ─── GET /rooms/:roomId/members ────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/members',
  tags: ['Rooms'],
  summary: '룸 멤버 목록 조회',
  description:
    '해당 룸의 멤버 목록과 실시간 상태(status, 위치, 캐릭터 등)를 반환합니다. ' +
    'setup을 완료한 멤버만 포함됩니다 (가입은 했으나 캐릭터/역할을 설정하지 않은 멤버는 제외). ' +
    '룸 멤버만 호출 가능하며, 비멤버 접근 시 룸 존재를 숨기기 위해 ROOM_NOT_FOUND 로 응답합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
  },
  responses: {
    200: {
      description: '멤버 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              members: z.array(RoomMemberResponseSchema),
              member_count: z.number(),
            }),
          }),
          example: {
            success: true,
            data: {
              members: [
                {
                  github_username: 'Kang-Ellie',
                  avatar_url:
                    'https://avatars.githubusercontent.com/u/252135802?v=4',
                  roles: ['frontend', 'backend'],
                  detailed_role: 'Frontend Developer',
                  character_type: 'cat',
                  nickname: '수정',
                  status: 'focus',
                  is_host: true,
                  pos_x: 0,
                  pos_y: 0,
                },
                {
                  github_username: 'jiyun-dev',
                  avatar_url: 'https://avatars.githubusercontent.com/u/1234',
                  roles: ['backend'],
                  detailed_role: 'Backend Developer',
                  character_type: 'dog',
                  nickname: '지윤',
                  status: 'rest',
                  is_host: false,
                  pos_x: 120,
                  pos_y: 80,
                },
              ],
              member_count: 2,
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음 (또는 멤버가 아님)',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/members/setup ─────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/members/setup',
  tags: ['Rooms'],
  summary: '룸 멤버 최초 캐릭터/역할 설정',
  description:
    '룸에 가입 후 처음 입장할 때 사용할 캐릭터, 닉네임, 역할/파트, 세부 직군을 설정합니다. ' +
    '한 번 설정되면 이후에는 PATCH /rooms/:roomId/members/me 를 사용해주세요. ' +
    '역할/파트는 중복 선택 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: SetupRoomMemberSchema,
          example: {
            character_type: 'cat',
            nickname: '수정',
            roles: ['frontend', 'backend'],
            detailed_role: 'Frontend Developer',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: '캐릭터/역할 설정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: RoomMemberResponseSchema,
          }),
          example: {
            success: true,
            data: {
              github_username: 'jiyun-dev',
              avatar_url: 'https://avatars.githubusercontent.com/u/1234',
              roles: ['frontend', 'backend'],
              detailed_role: 'Frontend Developer',
              character_type: 'cat',
              nickname: '수정',
              status: 'focus',
              is_host: true,
              pos_x: 0,
              pos_y: 0,
            },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸 멤버가 아님',
      'ROOM_MEMBER_NOT_FOUND',
      '룸 멤버를 찾을 수 없습니다.',
    ),
    409: errorResponse(
      '이미 setup 완료',
      'ROOM_MEMBER_ALREADY_SET_UP',
      '이미 캐릭터/역할이 설정되어 있습니다. 프로필 수정을 이용해주세요.',
    ),
  },
});
