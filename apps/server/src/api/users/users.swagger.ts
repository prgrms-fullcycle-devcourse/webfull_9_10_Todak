import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

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

// ─── GET /users/me ────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/users/me',
  tags: ['Users'],
  summary: '내 정보 조회',
  description: 'JWT 토큰으로 인증된 현재 로그인 사용자의 정보를 반환합니다.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: '내 정보 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              githubId: z.number(),
              login: z.string(),
              avatarUrl: z.string().url(),
            }),
          }),
          example: {
            success: true,
            data: {
              id: 'uuid-user-1',
              githubId: 12345678,
              login: 'jiyun-dev',
              avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
            },
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
  },
});
