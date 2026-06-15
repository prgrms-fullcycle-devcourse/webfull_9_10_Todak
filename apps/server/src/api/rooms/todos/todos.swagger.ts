import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import {
  CommentIdParamsSchema,
  CreateCommentSchema,
  CreateLabelSchema,
  CreateReactionSchema,
  CreateTodosSchema,
  GetTodosQueryOpenApiSchema,
  LabelNameParamsSchema,
  ReactionIdParamsSchema,
  RoomIdParamsSchema,
  TodoCommentSchema,
  TodoDetailResponseSchema,
  TodoEventSchema,
  TodoIdParamsSchema,
  TodoLabelSchema,
  TodoMilestoneSchema,
  TodoReactionSchema,
  TodoResponseSchema,
  UpdateCommentSchema,
  UpdateLabelSchema,
  UpdateTodoSchema,
} from './todos.schema.js';

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

const githubReauth401 = {
  description:
    '인증 실패 — 앱 인증 누락/만료(UNAUTHORIZED) 또는 GitHub 토큰 만료·무효(GITHUB_REAUTH_REQUIRED)',
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

const todoDetailExample = {
  id: '11aa6110-f556-4904-9dba-28c5cee72569',
  room_id: '04b4a500-f3b4-4e5a-b78f-a7b6775ca2b7',
  repo_id: 'uuid-repo-1',
  title: '[Todak Task] 미들웨어 인증 로직 리팩토링',
  body: 'JWT 검증 로직을 별도 미들웨어로 분리',
  labels: ['enhancement'],
  github_issue_number: 1,
  is_done: false,
  minutes_id: null,
  assignee: {
    id: 'uuid-user-1',
    github_username: 'kangyoungah',
    avatar_url: 'https://avatars.githubusercontent.com/u/1234',
  },
  created_at: '2026-05-28T08:20:45.721Z',
};

// ─── GET /rooms/:roomId/todos ──────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos',
  tags: ['Todos'],
  summary: 'Todo 목록 조회',
  description:
    '룸의 Todo 목록을 반환합니다. assignee_id, minutes_id, is_issued 쿼리로 필터링할 수 있습니다. ' +
    'is_issued=true 이면 GitHub 이슈로 발행된 Todo만 조회합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    query: GetTodosQueryOpenApiSchema,
  },
  responses: {
    200: {
      description: 'Todo 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              todos: z.array(TodoDetailResponseSchema),
            }),
          }),
          example: { success: true, data: { todos: [todoDetailExample] } },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸 멤버가 아님',
      'ROOM_MEMBER_NOT_FOUND',
      '룸 멤버를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/todos/me ───────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/me',
  tags: ['Todos'],
  summary: '내 Todo 목록 조회',
  description:
    'JWT 토큰에서 추출한 본인 ID를 기준으로, 내가 담당자인 Todo 중 GitHub 이슈로 발행된 것만 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
  },
  responses: {
    200: {
      description: '내 Todo 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              todos: z.array(TodoDetailResponseSchema),
            }),
          }),
          example: { success: true, data: { todos: [todoDetailExample] } },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸 멤버가 아님',
      'ROOM_MEMBER_NOT_FOUND',
      '룸 멤버를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/todos/labels ─────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/labels',
  tags: ['Todos'],
  summary: '레포 라벨 목록 조회',
  description:
    '룸에 연결된 GitHub 레포의 이슈 라벨 목록을 반환합니다 (레포가 여러 개인 경우 최초 연결 레포 기준). ' +
    'Todo 수정 UI의 라벨 autocomplete에 사용합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
  },
  responses: {
    200: {
      description: '라벨 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              labels: z.array(TodoLabelSchema),
            }),
          }),
          example: {
            success: true,
            data: {
              labels: [
                {
                  name: 'bug',
                  color: 'd73a4a',
                  description: "Something isn't working",
                },
                {
                  name: 'enhancement',
                  color: 'a2eeef',
                  description: 'New feature or request',
                },
              ],
            },
          },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      '룸 멤버/레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/todos ─────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/todos',
  tags: ['Todos'],
  summary: 'Todo 일괄 생성',
  description:
    'Todo를 한 번에 최대 30개까지 생성합니다. create_issue=true 이면 GitHub 이슈도 함께 발행합니다. ' +
    '성공 시 룸 전체에 todo:created 소켓 이벤트를 emit합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateTodosSchema,
          example: {
            todos: [
              {
                title: '미들웨어 인증 로직 리팩토링',
                body: 'JWT 검증 로직을 별도 미들웨어로 분리',
                labels: ['enhancement', 'backend'],
                assignee_id: 'uuid-user-1',
                create_issue: true,
              },
            ],
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Todo 생성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              todos: z.array(TodoResponseSchema),
            }),
          }),
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      '룸/멤버/레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});

// ─── PATCH /rooms/:roomId/todos/:todoId ──────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}/todos/{todoId}',
  tags: ['Todos'],
  summary: 'Todo 수정',
  description:
    'Todo의 title, body, labels, assignee_ids, milestone_number, is_done 을 수정합니다. ' +
    'GitHub 이슈가 연결된 Todo는 GitHub issues.update 후 DB를 갱신합니다. ' +
    'assignee_ids 는 복수 담당자를 지원하며, 빈 배열이면 전체 해제입니다. ' +
    'milestone_number 는 GET /milestones 로 조회한 번호를 사용하세요. null 이면 마일스톤 해제. ' +
    'is_done=true 는 close, false 는 reopen 입니다. ' +
    'labels 는 GitHub 기준 전체 교체입니다. 성공 시 todo:updated 소켓 이벤트를 emit합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: TodoIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateTodoSchema,
          example: {
            title: '미들웨어 인증 로직 리팩토링',
            labels: ['enhancement', 'backend'],
            assignee_ids: ['uuid-user-1', 'uuid-user-2'],
            milestone_number: 1,
            is_done: true,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Todo 수정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              todo: TodoDetailResponseSchema,
            }),
          }),
          example: {
            success: true,
            data: {
              todo: { ...todoDetailExample, is_done: true },
            },
          },
        },
      },
    },
    400: errorResponse(
      '수정 필드 없음',
      'BAD_REQUEST',
      '수정할 필드를 하나 이상 입력해주세요.',
    ),
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      'Todo 없음',
      'TODO_NOT_FOUND',
      'Todo를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/todos/:todoId ────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/{todoId}',
  tags: ['Todos'],
  summary: 'Todo 단건 조회',
  security: [{ bearerAuth: [] }],
  request: { params: TodoIdParamsSchema },
  responses: {
    200: {
      description: 'Todo 단건 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ todo: TodoDetailResponseSchema }),
          }),
          example: { success: true, data: { todo: todoDetailExample } },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      'Todo 없음',
      'TODO_NOT_FOUND',
      'Todo를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/todos/:todoId/comments ────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/{todoId}/comments',
  tags: ['Todos'],
  summary: 'Todo 댓글 목록',
  description:
    'GitHub 이슈의 댓글 목록을 반환합니다. GitHub 이슈와 연결된 Todo에만 사용 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: { params: TodoIdParamsSchema },
  responses: {
    200: {
      description: '댓글 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ comments: z.array(TodoCommentSchema) }),
          }),
        },
      },
    },
    400: errorResponse(
      'GitHub 이슈 미연결',
      'TODO_GITHUB_NOT_LINKED',
      'GitHub 이슈와 연결되지 않은 Todo입니다.',
    ),
    401: githubReauth401,
  },
});

// ─── POST /rooms/:roomId/todos/:todoId/comments ───────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/todos/{todoId}/comments',
  tags: ['Todos'],
  summary: 'Todo 댓글 작성',
  security: [{ bearerAuth: [] }],
  request: {
    params: TodoIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateCommentSchema,
          example: { body: 'PR 리뷰 완료했습니다.' },
        },
      },
    },
  },
  responses: {
    201: {
      description: '댓글 작성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ comment: TodoCommentSchema }),
          }),
        },
      },
    },
    400: errorResponse(
      'GitHub 이슈 미연결',
      'TODO_GITHUB_NOT_LINKED',
      'GitHub 이슈와 연결되지 않은 Todo입니다.',
    ),
    401: githubReauth401,
  },
});

// ─── PATCH /rooms/:roomId/todos/:todoId/comments/:commentId ───────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}/todos/{todoId}/comments/{commentId}',
  tags: ['Todos'],
  summary: 'Todo 댓글 수정',
  security: [{ bearerAuth: [] }],
  request: {
    params: CommentIdParamsSchema,
    body: { content: { 'application/json': { schema: UpdateCommentSchema } } },
  },
  responses: {
    200: {
      description: '댓글 수정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ comment: TodoCommentSchema }),
          }),
        },
      },
    },
    401: githubReauth401,
    404: errorResponse('댓글 없음', 'NOT_FOUND', '댓글을 찾을 수 없습니다.'),
  },
});

// ─── DELETE /rooms/:roomId/todos/:todoId/comments/:commentId ──────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/todos/{todoId}/comments/{commentId}',
  tags: ['Todos'],
  summary: 'Todo 댓글 삭제',
  security: [{ bearerAuth: [] }],
  request: { params: CommentIdParamsSchema },
  responses: {
    200: {
      description: '댓글 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), data: z.null() }),
          example: { success: true, data: null },
        },
      },
    },
    401: githubReauth401,
    404: errorResponse('댓글 없음', 'NOT_FOUND', '댓글을 찾을 수 없습니다.'),
  },
});

// ─── GET /rooms/:roomId/todos/milestones ──────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/milestones',
  tags: ['Todos'],
  summary: '레포 마일스톤 목록',
  description:
    '룸에 연결된 레포의 열린(open) 마일스톤 목록을 반환합니다. PATCH milestone_number 에 사용할 번호를 확인하는 용도입니다.',
  security: [{ bearerAuth: [] }],
  request: { params: RoomIdParamsSchema },
  responses: {
    200: {
      description: '마일스톤 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ milestones: z.array(TodoMilestoneSchema) }),
          }),
        },
      },
    },
    401: githubReauth401,
    404: errorResponse(
      '레포 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/todos/labels ─────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/todos/labels',
  tags: ['Todos'],
  summary: '레포 라벨 생성',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateLabelSchema,
          example: {
            name: 'hotfix',
            color: 'e11d48',
            description: '긴급 수정 사항',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: '라벨 생성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ label: TodoLabelSchema }),
          }),
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 부족',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    409: errorResponse('라벨 중복', 'CONFLICT', '이미 존재하는 리소스입니다.'),
  },
});

// ─── PATCH /rooms/:roomId/todos/labels/:labelName ─────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}/todos/labels/{labelName}',
  tags: ['Todos'],
  summary: '레포 라벨 수정',
  security: [{ bearerAuth: [] }],
  request: {
    params: LabelNameParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateLabelSchema,
          example: { new_name: 'urgent', color: 'dc2626' },
        },
      },
    },
  },
  responses: {
    200: {
      description: '라벨 수정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ label: TodoLabelSchema }),
          }),
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 부족',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '라벨 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── DELETE /rooms/:roomId/todos/labels/:labelName ────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/todos/labels/{labelName}',
  tags: ['Todos'],
  summary: '레포 라벨 삭제',
  security: [{ bearerAuth: [] }],
  request: { params: LabelNameParamsSchema },
  responses: {
    200: {
      description: '라벨 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), data: z.null() }),
          example: { success: true, data: null },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 부족',
      'REPO_ADMIN_REQUIRED',
      '레포지토리 Admin 권한이 필요합니다.',
    ),
    404: errorResponse(
      '라벨 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/todos/:todoId/events ──────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/todos/{todoId}/events',
  tags: ['Todos'],
  summary: 'Todo 이슈 이벤트 타임라인',
  description:
    'GitHub 이슈의 이벤트 타임라인을 반환합니다. labeled, assigned, milestoned, closed, reopened 등 변경 히스토리를 포함합니다.',
  security: [{ bearerAuth: [] }],
  request: { params: TodoIdParamsSchema },
  responses: {
    200: {
      description: '이벤트 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ events: z.array(TodoEventSchema) }),
          }),
        },
      },
    },
    400: errorResponse(
      'GitHub 이슈 미연결',
      'TODO_GITHUB_NOT_LINKED',
      'GitHub 이슈와 연결되지 않은 Todo입니다.',
    ),
    401: githubReauth401,
  },
});

// ─── POST /rooms/:roomId/todos/:todoId/reactions ──────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/todos/{todoId}/reactions',
  tags: ['Todos'],
  summary: 'Todo 리액션 추가',
  description:
    'GitHub 이슈에 리액션을 추가합니다. 같은 리액션이 이미 있으면 기존 리액션을 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: TodoIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateReactionSchema,
          example: { content: '+1' },
        },
      },
    },
  },
  responses: {
    201: {
      description: '리액션 추가 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ reaction: TodoReactionSchema }),
          }),
        },
      },
    },
    400: errorResponse(
      'GitHub 이슈 미연결',
      'TODO_GITHUB_NOT_LINKED',
      'GitHub 이슈와 연결되지 않은 Todo입니다.',
    ),
    401: githubReauth401,
  },
});

// ─── DELETE /rooms/:roomId/todos/:todoId/reactions/:reactionId ────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/todos/{todoId}/reactions/{reactionId}',
  tags: ['Todos'],
  summary: 'Todo 리액션 삭제',
  security: [{ bearerAuth: [] }],
  request: { params: ReactionIdParamsSchema },
  responses: {
    200: {
      description: '리액션 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({ success: z.literal(true), data: z.null() }),
          example: { success: true, data: null },
        },
      },
    },
    400: errorResponse(
      'GitHub 이슈 미연결',
      'TODO_GITHUB_NOT_LINKED',
      'GitHub 이슈와 연결되지 않은 Todo입니다.',
    ),
    401: githubReauth401,
    404: errorResponse(
      '리액션 없음',
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다.',
    ),
  },
});

// ─── DELETE /rooms/:roomId/todos/:todoId ─────────────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/todos/{todoId}',
  tags: ['Todos'],
  summary: 'Todo 삭제',
  description:
    'GitHub 이슈가 연결된 Todo는 GitHub에서 close 한 뒤 DB에서 삭제합니다. ' +
    '완료만 하고 보드에 남기려면 DELETE 대신 PATCH { is_done: true } 를 사용하세요. ' +
    '성공 시 todo:deleted 소켓 이벤트를 emit합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: TodoIdParamsSchema,
  },
  responses: {
    200: {
      description: 'Todo 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.null(),
          }),
          example: { success: true, data: null },
        },
      },
    },
    401: githubReauth401,
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      'Todo 없음',
      'TODO_NOT_FOUND',
      'Todo를 찾을 수 없습니다.',
    ),
  },
});
