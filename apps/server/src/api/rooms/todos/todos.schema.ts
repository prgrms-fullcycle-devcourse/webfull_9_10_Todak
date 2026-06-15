import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const RoomIdParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  }),
});

export const TodoIdParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  }),
  todoId: z.string().uuid().openapi({
    description: 'Todo ID',
    example: '11aa6110-f556-4904-9dba-28c5cee72569',
  }),
});

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
    .min(1, '최소 1개의 Todo를 입력해주세요.')
    .max(30, '한 번에 최대 30개까지 등록할 수 있습니다.'),
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

export const GetTodosQueryOpenApiSchema = z.object({
  assignee_id: z.string().uuid().optional().openapi({
    description: '담당자 User ID로 필터링',
    example: 'uuid-user-1',
  }),
  minutes_id: z.string().uuid().optional().openapi({
    description: '회의록 ID로 필터링',
    example: 'uuid-minutes-1',
  }),
  is_issued: z.enum(['true', 'false']).optional().openapi({
    description: 'GitHub 이슈 발행된 Todo만 필터링 (true/false)',
    example: 'true',
  }),
});

export const UpdateTodoSchema = z
  .object({
    title: z.string().trim().min(1).optional().openapi({
      description: 'Todo 제목',
      example: '미들웨어 인증 로직 리팩토링',
    }),
    body: z.string().nullable().optional().openapi({
      description: 'Todo 본문',
      example: 'JWT 검증 로직을 별도 미들웨어로 분리',
    }),
    labels: z
      .array(z.string())
      .optional()
      .openapi({
        description: 'GitHub 이슈 라벨 (전체 교체)',
        example: ['enhancement', 'backend'],
      }),
    assignee_ids: z
      .array(z.string().uuid())
      .optional()
      .openapi({
        description: '담당자 User ID 목록 (빈 배열이면 전체 해제, 복수 가능)',
        example: ['uuid-user-1', 'uuid-user-2'],
      }),
    milestone_number: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .openapi({
        description: '마일스톤 번호 (null이면 해제)',
        example: 1,
      }),
    is_done: z.boolean().optional().openapi({
      description: '완료 여부 (true=close, false=reopen)',
      example: true,
    }),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.body !== undefined ||
      data.labels !== undefined ||
      data.assignee_ids !== undefined ||
      data.milestone_number !== undefined ||
      data.is_done !== undefined,
    { message: '수정할 필드를 하나 이상 입력해주세요.' },
  );

export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

export const TodoLabelSchema = registry.register(
  'TodoLabel',
  z.object({
    name: z.string().openapi({ example: 'enhancement' }),
    color: z.string().openapi({ example: 'a2eeef' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'New feature or request' }),
  }),
);

export const TodoAssigneeSchema = registry.register(
  'TodoAssignee',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-user-1' }),
    github_username: z.string().openapi({ example: 'kangyoungah' }),
    avatar_url: z
      .string()
      .nullable()
      .openapi({ example: 'https://avatars.githubusercontent.com/u/1234' }),
  }),
);

export const TodoResponseSchema = registry.register(
  'Todo',
  z.object({
    id: z.string().openapi({ example: 'uuid-todo-1' }),
    room_id: z.string().openapi({ example: 'uuid-room-1' }),
    repo_id: z.string().nullable().openapi({ example: 'uuid-repo-1' }),
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

export const TodoDetailResponseSchema = registry.register(
  'TodoDetail',
  z.object({
    id: z.string().openapi({ example: '11aa6110-f556-4904-9dba-28c5cee72569' }),
    room_id: z
      .string()
      .openapi({ example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7' }),
    repo_id: z.string().nullable().openapi({ example: 'uuid-repo-1' }),
    title: z
      .string()
      .openapi({ example: '[Todak Task] 미들웨어 인증 로직 리팩토링' }),
    body: z
      .string()
      .nullable()
      .openapi({ example: 'JWT 검증 로직을 별도 미들웨어로 분리' }),
    labels: z.array(z.string()).openapi({ example: ['enhancement'] }),
    github_issue_number: z.number().nullable().openapi({ example: 1 }),
    milestone_number: z.number().nullable().openapi({ example: 1 }),
    is_done: z.boolean().openapi({ example: false }),
    minutes_id: z.string().nullable().openapi({ example: 'uuid-minutes-1' }),
    assignee: TodoAssigneeSchema.nullable(),
    created_at: z.string().openapi({ example: '2026-05-28T08:20:45.721Z' }),
  }),
);

export const CommentIdParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  }),
  todoId: z.string().uuid().openapi({
    description: 'Todo ID',
    example: '11aa6110-f556-4904-9dba-28c5cee72569',
  }),
  commentId: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ description: 'GitHub 댓글 ID', example: 1234567 }),
});

export const LabelNameParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  }),
  labelName: z
    .string()
    .min(1)
    .openapi({ description: '라벨 이름', example: 'bug' }),
});

export const ReactionIdParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  }),
  todoId: z.string().uuid().openapi({
    description: 'Todo ID',
    example: '11aa6110-f556-4904-9dba-28c5cee72569',
  }),
  reactionId: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ description: 'GitHub 리액션 ID', example: 9876543 }),
});

export const CreateCommentSchema = z.object({
  body: z.string().trim().min(1).openapi({
    description: '댓글 내용',
    example: 'PR 리뷰 완료했습니다.',
  }),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  body: z.string().trim().min(1).openapi({
    description: '수정할 댓글 내용',
    example: '내용을 보강해서 다시 작성했습니다.',
  }),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

export const CreateLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .openapi({ description: '라벨 이름', example: 'hotfix' }),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/, 'color는 6자리 hex 코드여야 합니다.')
    .openapi({ description: '라벨 색상 (hex, # 없이)', example: 'e11d48' }),
  description: z
    .string()
    .optional()
    .openapi({ description: '라벨 설명', example: '긴급 수정 사항' }),
});

export type CreateLabelInput = z.infer<typeof CreateLabelSchema>;

export const UpdateLabelSchema = z
  .object({
    new_name: z
      .string()
      .trim()
      .min(1)
      .optional()
      .openapi({ description: '새 라벨 이름', example: 'urgent' }),
    color: z
      .string()
      .regex(/^[0-9a-fA-F]{6}$/)
      .optional()
      .openapi({ description: '새 색상 (hex)', example: 'dc2626' }),
    description: z
      .string()
      .optional()
      .openapi({ description: '새 설명', example: '긴급 수정' }),
  })
  .refine(
    data =>
      data.new_name !== undefined ||
      data.color !== undefined ||
      data.description !== undefined,
    { message: '수정할 필드를 하나 이상 입력해주세요.' },
  );

export type UpdateLabelInput = z.infer<typeof UpdateLabelSchema>;

export const CreateReactionSchema = z.object({
  content: z
    .enum([
      '+1',
      '-1',
      'laugh',
      'confused',
      'heart',
      'hooray',
      'rocket',
      'eyes',
    ])
    .openapi({ description: 'GitHub 리액션 종류', example: '+1' }),
});

export type CreateReactionInput = z.infer<typeof CreateReactionSchema>;

export const TodoCommentSchema = registry.register(
  'TodoComment',
  z.object({
    id: z.number().openapi({ example: 1234567 }),
    body: z.string().openapi({ example: 'PR 리뷰 완료했습니다.' }),
    author_login: z.string().openapi({ example: 'kangyoungah' }),
    author_avatar_url: z
      .string()
      .openapi({ example: 'https://avatars.githubusercontent.com/u/1234' }),
    created_at: z.string().openapi({ example: '2026-05-28T09:00:00Z' }),
    updated_at: z.string().openapi({ example: '2026-05-28T09:05:00Z' }),
  }),
);

export const TodoMilestoneSchema = registry.register(
  'TodoMilestone',
  z.object({
    number: z.number().openapi({ example: 1 }),
    title: z.string().openapi({ example: 'Sprint 1' }),
    description: z.string().nullable().openapi({ example: '첫 번째 스프린트' }),
    state: z.enum(['open', 'closed']).openapi({ example: 'open' }),
    due_on: z.string().nullable().openapi({ example: '2026-06-30T00:00:00Z' }),
    open_issues: z.number().openapi({ example: 5 }),
    closed_issues: z.number().openapi({ example: 3 }),
  }),
);

export const TodoEventSchema = registry.register(
  'TodoEvent',
  z.object({
    id: z.number().openapi({ example: 9876543 }),
    event: z.string().openapi({ example: 'labeled' }),
    actor_login: z.string().openapi({ example: 'kangyoungah' }),
    actor_avatar_url: z
      .string()
      .openapi({ example: 'https://avatars.githubusercontent.com/u/1234' }),
    created_at: z.string().openapi({ example: '2026-05-28T09:00:00Z' }),
    label: z.string().optional().openapi({ example: 'enhancement' }),
    assignee: z.string().optional().openapi({ example: 'teamuser' }),
    milestone: z.string().optional().openapi({ example: 'Sprint 1' }),
  }),
);

export const TodoReactionSchema = registry.register(
  'TodoReaction',
  z.object({
    id: z.number().openapi({ example: 111222333 }),
    content: z
      .enum([
        '+1',
        '-1',
        'laugh',
        'confused',
        'heart',
        'hooray',
        'rocket',
        'eyes',
      ])
      .openapi({ example: '+1' }),
    user_login: z.string().openapi({ example: 'kangyoungah' }),
    created_at: z.string().openapi({ example: '2026-05-28T09:00:00Z' }),
  }),
);
