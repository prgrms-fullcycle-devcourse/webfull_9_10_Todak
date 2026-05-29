import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const CreateTodosSchema = z.object({
  todos: z
    .array(
      z.object({
        title: z.string().trim().min(1).openapi({
          description: 'Todo 제목',
          example: '미들웨어 인증 로직 리팩토링',
        }),
        body: z.string().optional().openapi({
          description: 'Todo 본문',
          example: 'JWT 검증 로직을 별도 미들웨어로 분리',
        }),
        labels: z
          .array(z.string())
          .default([])
          .openapi({
            description: 'GitHub 이슈 라벨',
            example: ['enhancement', 'backend'],
          }),
        assignee_id: z.string().uuid().optional().openapi({
          description: '담당자 User ID',
          example: 'uuid-user-1',
        }),
        minutes_id: z.string().uuid().optional().openapi({
          description: '출처 회의록 ID',
          example: 'uuid-minutes-1',
        }),
        create_issue: z.boolean().default(false).openapi({
          description: 'GitHub 이슈 발행 여부',
          example: true,
        }),
      }),
    )
    .min(1, '최소 1개의 Todo를 입력해주세요.'),
});

export type CreateTodosInput = z.infer<typeof CreateTodosSchema>;

export const GetTodosQuerySchema = z.object({
  assignee_id: z.string().uuid().optional().openapi({
    description: '담당자 User ID로 필터링',
    example: 'uuid-user-1',
  }),
  minutes_id: z.string().uuid().optional().openapi({
    description: '회의록 ID로 필터링',
    example: 'uuid-minutes-1',
  }),
  is_issued: z
    .enum(['true', 'false'])
    .optional()
    .transform(val => (val === undefined ? undefined : val === 'true'))
    .openapi({
      description: 'GitHub 이슈 발행된 Todo만 필터링',
      example: 'true',
    }),
});

export type GetTodosQuery = z.infer<typeof GetTodosQuerySchema>;

export const TodoResponseSchema = registry.register(
  'Todo',
  z.object({
    id: z.string().openapi({ example: 'uuid-todo-1' }),
    room_id: z.string().openapi({ example: 'uuid-room-1' }),
    title: z.string().openapi({ example: '미들웨어 인증 로직 리팩토링' }),
    body: z.string().nullable().openapi({ example: 'JWT 검증 로직 분리' }),
    labels: z.array(z.string()).openapi({ example: ['enhancement'] }),
    assignee_id: z.string().nullable().openapi({ example: 'uuid-user-1' }),
    minutes_id: z.string().nullable().openapi({ example: 'uuid-minutes-1' }),
    github_issue_number: z.number().nullable().openapi({ example: 42 }),
    is_done: z.boolean().openapi({ example: false }),
    created_at: z.string().openapi({ example: '2026-05-28T00:00:00.000Z' }),
  }),
);
