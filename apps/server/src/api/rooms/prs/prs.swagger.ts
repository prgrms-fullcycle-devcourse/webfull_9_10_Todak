import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

import {
  GetPullRequestDetailParamsSchema,
  GetPullRequestsQuerySchema,
  MergePullRequestBodySchema,
  MergePullRequestResponseSchema,
  PullRequestDetailResponseSchema,
  PullRequestResponseSchema,
} from './prs.schema.js';

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

const RoomParamsSchema = z.object({
  roomId: z.uuid().openapi({ description: '프로젝트 룸 ID' }),
});

// ─── GET /rooms/:roomId/prs ────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/prs',
  tags: ['PRs'],
  summary: 'PR 목록 조회',
  description:
    '룸에 연결된 레포지토리의 Pull Request 목록을 조회합니다. ' +
    'state 로 상태(open/closed/merged/all)를 필터링하며, 룸 멤버만 호출 가능합니다. ' +
    'GitHub 은 merged 필터를 직접 지원하지 않아 closed 를 받아 merged_at 으로 구분합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomParamsSchema,
    query: GetPullRequestsQuerySchema,
  },
  responses: {
    200: {
      description: 'PR 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              pull_requests: z.array(PullRequestResponseSchema),
              pagination: z.object({
                page: z.number(),
                limit: z.number(),
                has_more: z.boolean(),
              }),
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
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      '룸/멤버/레포를 찾을 수 없음',
      'ROOM_REPO_NOT_FOUND',
      '룸에 연결된 레포지토리가 없습니다.',
    ),
    502: errorResponse(
      'GitHub API 오류',
      'GITHUB_API_ERROR',
      'GitHub API 오류가 발생했습니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/prs/:pullNumber ────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/prs/{pullNumber}',
  tags: ['PRs'],
  summary: 'PR 상세 조회',
  description:
    '룸 레포지토리의 특정 PR 단건 상세를 조회합니다. ' +
    '목록 필드에 더해 본문(body)·머지 가능 여부(mergeable)·변경량(changes)을 제공합니다. ' +
    '룸 멤버만 호출 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: GetPullRequestDetailParamsSchema,
  },
  responses: {
    200: {
      description: 'PR 상세 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: PullRequestDetailResponseSchema,
          }),
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      'GitHub 권한 동의 필요',
      'GITHUB_SCOPE_REQUIRED',
      'GitHub 권한 동의가 필요합니다.',
    ),
    404: errorResponse(
      'PR/룸/멤버/레포를 찾을 수 없음',
      'PR_NOT_FOUND',
      'Pull Request를 찾을 수 없습니다.',
    ),
    502: errorResponse(
      'GitHub API 오류',
      'GITHUB_API_ERROR',
      'GitHub API 오류가 발생했습니다.',
    ),
  },
});

// ─── PUT /rooms/:roomId/prs/:pullNumber/merge ──────────────────────────────
registry.registerPath({
  method: 'put',
  path: '/rooms/{roomId}/prs/{pullNumber}/merge',
  tags: ['PRs'],
  summary: 'PR 머지',
  description:
    '룸 레포지토리의 특정 PR 을 머지합니다. merge_method(기본 squash)와 ' +
    'commit_title/commit_message(선택)를 받습니다. GitHub 에 실제 쓰기 작업이며 ' +
    '룸 멤버만 호출 가능합니다. 머지 성공 시 pr:merged 소켓은 웹훅 경로가 처리합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: GetPullRequestDetailParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: MergePullRequestBodySchema,
          example: { merge_method: 'squash' },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'PR 머지 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: MergePullRequestResponseSchema,
          }),
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    403: errorResponse(
      '권한 없음(GitHub 토큰/쓰기 권한)',
      'FORBIDDEN',
      '접근 권한이 없습니다.',
    ),
    404: errorResponse(
      'PR/룸/멤버/레포를 찾을 수 없음',
      'PR_NOT_FOUND',
      'Pull Request를 찾을 수 없습니다.',
    ),
    405: errorResponse(
      '머지할 수 없는 PR',
      'PR_NOT_MERGEABLE',
      '머지할 수 없는 PR입니다. (드래프트/체크 미통과/이미 닫힘 등)',
    ),
    409: errorResponse(
      '충돌 또는 HEAD 변경',
      'PR_MERGE_CONFLICT',
      '충돌 또는 HEAD 변경으로 머지에 실패했습니다.',
    ),
    502: errorResponse(
      'GitHub API 오류',
      'GITHUB_API_ERROR',
      'GitHub API 오류가 발생했습니다.',
    ),
  },
});
