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

export const GetPullRequestDetailParamsSchema = z.object({
  roomId: z.uuid(),
  pullNumber: z.coerce.number().int().positive().openapi({
    description: '조회할 PR 번호',
    example: 42,
  }),
});

export type GetPullRequestDetailParams = z.infer<
  typeof GetPullRequestDetailParamsSchema
>;

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

// 단건 상세 (목록 필드 + pulls.get 전용 body/mergeable/changes)
export const PullRequestDetailResponseSchema = registry.register(
  'PullRequestDetail',
  z.object({
    number: z.number().openapi({ example: 42 }),
    title: z.string().openapi({ example: 'feat: PR 목록 조회 API 추가' }),
    state: z.string().openapi({ example: 'open' }),
    is_draft: z.boolean().openapi({ example: false }),
    is_merged: z.boolean().openapi({ example: false }),
    body: z.string().nullable().openapi({ example: '## 작업 내용\n- ...' }),
    mergeable: z.boolean().nullable().openapi({ example: true }),
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
    changes: z.object({
      additions: z.number().openapi({ example: 120 }),
      deletions: z.number().openapi({ example: 30 }),
      changed_files: z.number().openapi({ example: 8 }),
      commits: z.number().openapi({ example: 5 }),
    }),
    created_at: z.string().openapi({ example: '2026-05-31T00:00:00.000Z' }),
    updated_at: z.string().openapi({ example: '2026-05-31T01:00:00.000Z' }),
    merged_at: z.string().nullable().openapi({ example: null }),
    html_url: z.string().openapi({
      example: 'https://github.com/todak/web/pull/42',
    }),
  }),
);

export const MergePullRequestBodySchema = z.object({
  merge_method: z
    .enum(['merge', 'squash', 'rebase'])
    .optional()
    .default('squash')
    .openapi({ description: '머지 방식 (기본 squash)', example: 'squash' }),
  commit_title: z.string().optional().openapi({
    description: '머지 커밋 제목 (선택, 없으면 GitHub 기본값)',
  }),
  commit_message: z.string().optional().openapi({
    description: '머지 커밋 본문 (선택, 없으면 GitHub 기본값)',
  }),
});

export type MergePullRequestBody = z.infer<typeof MergePullRequestBodySchema>;

export const MergePullRequestResponseSchema = registry.register(
  'PullRequestMergeResult',
  z.object({
    merged: z.boolean().openapi({ example: true }),
    pull_number: z.number().openapi({ example: 42 }),
    merge_commit_sha: z.string().openapi({ example: '4c2646c7d1e76efe...' }),
  }),
);

export const CreatePullRequestReviewBodySchema = z
  .object({
    event: z
      .enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT'])
      .optional()
      .default('APPROVE')
      .openapi({ description: '리뷰 종류 (기본 APPROVE)', example: 'APPROVE' }),
    body: z.string().optional().openapi({
      description: '리뷰 코멘트 (COMMENT/REQUEST_CHANGES 면 필수)',
    }),
  })
  .refine(
    data =>
      data.event === 'APPROVE' ||
      (data.body !== undefined && data.body.trim() !== ''),
    { message: 'COMMENT/REQUEST_CHANGES 는 body 가 필요합니다.' },
  );

export type CreatePullRequestReviewBody = z.infer<
  typeof CreatePullRequestReviewBodySchema
>;

export const PullRequestReviewResponseSchema = registry.register(
  'PullRequestReviewResult',
  z.object({
    pull_number: z.number().openapi({ example: 42 }),
    review_id: z.number().openapi({ example: 987654 }),
    state: z.string().openapi({ example: 'APPROVED' }),
    submitted_at: z
      .string()
      .nullable()
      .openapi({ example: '2026-06-08T00:00:00.000Z' }),
  }),
);
