import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import { ConnectRepoSchema } from './repo.schema.js';

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

// ─── PUT /rooms/{roomId}/repo ──────────────────────────────────────────────────
registry.registerPath({
  method: 'put',
  path: '/rooms/{roomId}/repo',
  tags: ['Rooms'],
  summary: '레포지토리 연결 / 교체',
  description:
    '룸에 GitHub 레포지토리를 연결하거나 다른 레포로 교체합니다. 방장만 가능하며 ' +
    '멱등하게 동작합니다(연결된 레포가 없으면 신규 연결, 있으면 교체). ' +
    '새 레포에 웹훅을 등록한 뒤 이전 웹훅을 해제하며, 교체 시 통계 캐시는 초기화됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ roomId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: ConnectRepoSchema,
          example: { repo_full_name: 'owner/new-repo' },
        },
      },
    },
  },
  responses: {
    200: {
      description: '연결 / 교체 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              repo_id: z.string().uuid(),
              room_id: z.string().uuid(),
              repo_full_name: z.string(),
              webhook_registered: z.boolean(),
            }),
          }),
          example: {
            success: true,
            data: {
              repo_id: '550e8400-e29b-41d4-a716-446655440000',
              room_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
              repo_full_name: 'owner/new-repo',
              webhook_registered: true,
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      '권한 없음 (방장 아님 / 레포 Admin 권한 없음)',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      'GitHub 레포를 찾을 수 없음',
      'REPO_NOT_FOUND',
      '레포지토리를 찾을 수 없습니다.',
    ),
    409: errorResponse(
      '다른 룸에서 이미 사용 중인 레포',
      'REPO_ALREADY_IN_USE',
      '이미 다른 룸에서 사용 중인 레포지토리입니다.',
    ),
  },
});

// ─── DELETE /rooms/{roomId}/repo ───────────────────────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/repo',
  tags: ['Rooms'],
  summary: '레포지토리 연결 해제',
  description:
    '룸은 유지하고 연결된 GitHub 레포지토리만 해제합니다. 방장만 가능하며, ' +
    'GitHub 웹훅 해제 후 Repo 레코드를 삭제합니다. ' +
    '이미 동기화된 Todo 등 데이터는 보존됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ roomId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: '연결 해제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
          example: { success: true, message: '레포 연결이 해제되었습니다.' },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      '권한 없음 (방장 아님)',
      'FORBIDDEN',
      '접근 권한이 없습니다.',
    ),
    404: errorResponse(
      '룸에 연결된 레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});
