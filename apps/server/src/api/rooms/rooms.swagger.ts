import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

import {
  CreateRoomSchema,
  JoinRoomSchema,
  UpdateRoomSchema,
} from './rooms.schema.js';

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

const RoomIdParamSchema = z.object({
  roomId: z
    .string()
    .uuid()
    .openapi({ description: '룸 ID', example: 'uuid-room-1' }),
});

// ─── GET /rooms ───────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms',
  tags: ['Rooms'],
  summary: '내가 속한 룸 목록 조회',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: '룸 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string().uuid(),
                name: z.string(),
                status: z.string(),
                invite_code: z.string(),
                repo: z.object({ full_name: z.string() }).nullable(),
                members: z.array(
                  z.object({
                    github_username: z.string(),
                    avatar_url: z.string().nullable(),
                  }),
                ),
                member_count: z.number(),
                last_synced_at: z.string().datetime().nullable(),
                stats: z.any().nullable(),
              }),
            ),
          }),
          example: {
            success: true,
            data: [
              {
                id: 'uuid-room-1',
                name: '개발팀 룸',
                status: 'ACTIVE',
                invite_code: 'ABCD-1234',
                repo: { full_name: 'org/my-repo' },
                members: [
                  {
                    github_username: 'jiyun-dev',
                    avatar_url: 'https://avatars.githubusercontent.com/u/1234',
                  },
                ],
                member_count: 3,
                last_synced_at: null,
                stats: null,
              },
            ],
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
  },
});

// ─── POST /rooms ──────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms',
  tags: ['Rooms'],
  summary: '룸 생성',
  description:
    '새로운 룸을 생성합니다. GitHub 레포지토리에 Admin 권한이 있어야 하며, webhook이 자동으로 등록됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRoomSchema,
          example: {
            name: '개발팀 룸',
            repo_full_name: 'org/my-repo',
            max_members: 6,
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: '룸 생성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              name: z.string(),
              invite_code: z.string(),
              repo_full_name: z.string(),
              webhook_registered: z.literal(true),
            }),
          }),
          example: {
            success: true,
            data: {
              id: 'uuid-room-1',
              name: '개발팀 룸',
              invite_code: 'ABCD-1234',
              repo_full_name: 'org/my-repo',
              webhook_registered: true,
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      'GitHub Admin 권한 없음',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    409: errorResponse(
      '레포지토리 중복',
      'REPO_ALREADY_IN_USE',
      '이미 다른 룸에서 사용 중인 레포지토리입니다.',
    ),
  },
});

// ─── POST /rooms/join ─────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/join',
  tags: ['Rooms'],
  summary: '초대 코드로 룸 입장',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: JoinRoomSchema,
          example: { invite_code: 'ABCD-1234' },
        },
      },
    },
  },
  responses: {
    200: {
      description: '룸 입장 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            room_id: z.string().uuid(),
            name: z.string(),
          }),
          example: {
            success: true,
            room_id: 'uuid-room-1',
            name: '개발팀 룸',
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '유효하지 않은 초대 코드',
      'INVALID_INVITE_CODE',
      '유효하지 않은 초대 코드입니다.',
    ),
    409: errorResponse(
      '룸 입장 불가',
      'ALREADY_JOINED / ROOM_FULL',
      '이미 참여한 룸이거나 정원이 초과되었습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId ───────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}',
  tags: ['Rooms'],
  summary: '특정 룸 상세 조회',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
  },
  responses: {
    200: {
      description: '룸 상세 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              name: z.string(),
              status: z.string(),
              invite_code: z.string(),
              max_members: z.number(),
              created_at: z.string().datetime(),
              repo: z
                .object({
                  full_name: z.string(),
                  default_branch: z.string().nullable(),
                  stats_cache: z.any().nullable(),
                  stats_cached_at: z.string().datetime().nullable(),
                })
                .nullable(),
              members: z.array(
                z.object({
                  github_username: z.string(),
                  avatar_url: z.string().nullable(),
                  roles: z.array(z.string()),
                  detailed_role: z.string().nullable(),
                  character_type: z.string().nullable(),
                  nickname: z.string().nullable(),
                  status: z.string(),
                  is_host: z.boolean(),
                  pos_x: z.number(),
                  pos_y: z.number(),
                }),
              ),
              member_count: z.number(),
            }),
          }),
          example: {
            success: true,
            data: {
              id: 'uuid-room-1',
              name: '개발팀 룸',
              status: 'ACTIVE',
              invite_code: 'ABCD-1234',
              max_members: 6,
              created_at: '2026-05-26T09:00:00.000Z',
              repo: {
                full_name: 'org/my-repo',
                default_branch: 'main',
                stats_cache: null,
                stats_cached_at: null,
              },
              members: [
                {
                  github_username: 'jiyun-dev',
                  avatar_url: 'https://avatars.githubusercontent.com/u/1234',
                  roles: ['frontend', 'backend'],
                  detailed_role: 'Frontend Developer',
                  character_type: 'cat',
                  nickname: null,
                  status: 'ONLINE',
                  is_host: true,
                  pos_x: 0,
                  pos_y: 0,
                },
              ],
              member_count: 1,
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── PATCH /rooms/:roomId ─────────────────────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}',
  tags: ['Rooms'],
  summary: '룸 정보 수정',
  description:
    '룸 이름 또는 최대 인원을 수정합니다. name과 max_members 중 하나 이상 입력해야 합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateRoomSchema,
          example: {
            name: '새로운 룸 이름',
            max_members: 8,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: '룸 정보 수정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              name: z.string(),
              max_members: z.number(),
            }),
          }),
          example: {
            success: true,
            data: {
              id: 'uuid-room-1',
              name: '새로운 룸 이름',
              max_members: 8,
            },
          },
        },
      },
    },
    400: errorResponse(
      '잘못된 요청',
      'BAD_REQUEST',
      '수정할 항목을 하나 이상 입력해주세요.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── DELETE /rooms/:roomId ────────────────────────────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}',
  tags: ['Rooms'],
  summary: '룸 삭제',
  description:
    '룸 멤버라면 누구나 삭제할 수 있습니다. GitHub webhook을 자동으로 해제하고 관련 데이터를 모두 삭제합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
  },
  responses: {
    200: {
      description: '룸 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
          example: {
            success: true,
            message: '룸이 삭제되었습니다.',
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});
