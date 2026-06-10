import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

import { CreateRepoSchema } from './repos.schema.js';

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

/*
 * GitHub API 를 호출하는 엔드포인트의 공통 401.
 * 앱 인증 누락/만료(UNAUTHORIZED) 또는 GitHub 토큰 만료·무효로 재로그인 필요(GITHUB_REAUTH_REQUIRED).
 */
const githubReauth401 = {
  description:
    '인증 실패 — 앱 인증 누락/만료(UNAUTHORIZED) 또는 GitHub 토큰 만료·무효로 GitHub 재로그인 필요(GITHUB_REAUTH_REQUIRED)',
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(false),
        error: z.string(),
        code: z.enum(['UNAUTHORIZED', 'GITHUB_REAUTH_REQUIRED']),
      }),
      example: {
        success: false,
        error: 'GitHub 인증이 만료되었습니다. 다시 로그인해주세요.',
        code: 'GITHUB_REAUTH_REQUIRED',
      },
    },
  },
};

// ─── POST /repos ──────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/repos',
  tags: ['Repos'],
  summary: 'GitHub 레포지토리 생성',
  description:
    'GitHub에 새 레포지토리를 생성합니다. org를 지정하면 조직 레포지토리로, ' +
    '생략하면 개인 레포지토리로 생성됩니다.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRepoSchema,
          example: {
            name: 'my-new-repo',
            org: 'my-org',
            private: true,
            auto_init: true,
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: '레포지토리 생성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              full_name: z.string(),
              html_url: z.string().url(),
              private: z.boolean(),
              default_branch: z.string(),
            }),
          }),
          example: {
            success: true,
            data: {
              full_name: 'my-org/my-new-repo',
              html_url: 'https://github.com/my-org/my-new-repo',
              private: true,
              default_branch: 'main',
            },
          },
        },
      },
    },
    401: githubReauth401,
    502: errorResponse(
      'GitHub API 오류',
      'GITHUB_API_ERROR',
      'GitHub API 오류가 발생했습니다.',
    ),
  },
});
