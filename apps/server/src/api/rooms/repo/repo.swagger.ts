import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

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
