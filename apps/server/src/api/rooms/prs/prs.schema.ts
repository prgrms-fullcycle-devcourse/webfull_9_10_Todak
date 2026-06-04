import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const GetPullRequestsQuerySchema = z.object({
  state: z
    .enum(['open', 'closed', 'merged', 'all'])
    .optional()
    .default('open')
    .openapi({
      description:
        'PR 상태 필터 (기본값 open). merged 는 closed 중 머지된 것, closed 는 머지되지 않고 닫힌 것만.',
      example: 'open',
    }),
  page: z.coerce.number().int().positive().optional().default(1).openapi({
    description: '페이지 번호 (기본값 1)',
    example: 1,
  }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(30)
    .openapi({
      description: '페이지당 개수 (기본값 30, 최대 100)',
      example: 30,
    }),
});

export type GetPullRequestsQuery = z.infer<typeof GetPullRequestsQuerySchema>;

export const PullRequestResponseSchema = registry.register(
  'PullRequest',
  z.object({
    number: z.number().openapi({ example: 42 }),
    title: z
      .string()
      .openapi({ example: 'feat: 회의록 PR 목록 조회 API 추가' }),
    state: z.string().openapi({ example: 'open' }),
    is_draft: z.boolean().openapi({ example: false }),
    is_merged: z.boolean().openapi({ example: false }),
    author: z
      .object({
        github_username: z.string().openapi({ example: 'tkdgh7063' }),
        avatar_url: z.string().nullable().openapi({
          example: 'https://avatars.githubusercontent.com/u/1?v=4',
        }),
      })
      .nullable(),
    branch: z.object({
      head: z.string().openapi({ example: 'feature/prs-api' }),
      base: z.string().openapi({ example: 'develop' }),
    }),
    assignees: z.array(
      z.object({
        github_username: z.string().openapi({ example: 'tkdgh7063' }),
        avatar_url: z.string().nullable().openapi({
          example: 'https://avatars.githubusercontent.com/u/1?v=4',
        }),
      }),
    ),
    labels: z
      .array(z.string())
      .openapi({ example: ['enhancement', 'backend'] }),
    created_at: z.string().openapi({ example: '2026-05-31T00:00:00.000Z' }),
    updated_at: z.string().openapi({ example: '2026-05-31T01:00:00.000Z' }),
    merged_at: z.string().nullable().openapi({ example: null }),
    html_url: z.string().openapi({
      example: 'https://github.com/todak/web/pull/42',
    }),
  }),
);
