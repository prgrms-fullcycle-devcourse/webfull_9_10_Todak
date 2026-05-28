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

// ─── GET /auth/github ─────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/auth/github',
  tags: ['Auth'],
  summary: 'GitHub OAuth 로그인',
  description: 'GitHub OAuth 인증 페이지로 리다이렉트합니다.',
  responses: {
    302: {
      description: 'GitHub 인증 페이지로 리다이렉트',
    },
  },
});

// ─── GET /auth/github/callback ────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/auth/github/callback',
  tags: ['Auth'],
  summary: 'GitHub OAuth 콜백',
  description:
    'GitHub 인증 완료 후 호출되는 콜백 엔드포인트입니다. ' +
    'JWT 토큰을 발급하고 클라이언트(/auth/callback?token=...)로 리다이렉트합니다.',
  request: {
    query: z.object({
      code: z.string().openapi({
        description: 'GitHub OAuth 인증 코드',
        example: 'abc123',
      }),
    }),
  },
  responses: {
    302: {
      description: '클라이언트로 JWT 토큰과 함께 리다이렉트',
    },
    400: errorResponse(
      '인증 코드 누락',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
  },
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: '로그아웃',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: '로그아웃 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
          }),
          example: {
            success: true,
            message: '로그아웃 되었습니다.',
          },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
  },
});
