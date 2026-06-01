import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

import { MinutesSchema } from './minutes.schema.js';

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

// ─── 공통 응답 스키마 ────────────────────────────────────────────────────────
const AuthorSchema = z.object({
  id: z.string(),
  github_username: z.string(),
  avatar_url: z.string().nullable(),
});

// 액션 아이템 (Todo 생성 API와 동일한 title/body/labels 구조)
const ActionItemSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  labels: z.array(z.string()),
});

// 목록 아이템 (작성자 요약 포함, content_md/action_items 제외)
const MinutesListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['meeting', 'troubleshooting', 'etc']),
  status: z.enum(['draft', 'confirmed', 'generating', 'failed']),
  author: AuthorSchema,
  linked_issue_numbers: z.array(z.number()),
  created_at: z.string(),
  updated_at: z.string(),
});

// 회의록 단건 (작성자 요약 포함, 본문 전체)
const MinutesDetailSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  meeting_id: z.string().nullable(),
  title: z.string(),
  type: z.enum(['meeting', 'troubleshooting', 'etc']),
  content_md: z.string().nullable(),
  action_items: z.array(ActionItemSchema),
  status: z.enum(['draft', 'confirmed', 'generating', 'failed']),
  linked_issue_numbers: z.array(z.number()),
  author: AuthorSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

// 생성/수정 직후 반환 (작성자 요약 없이 author_id 포함)
const MinutesMutationResultSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  meeting_id: z.string().nullable(),
  author_id: z.string(),
  title: z.string(),
  type: z.enum(['meeting', 'troubleshooting', 'etc']),
  content_md: z.string().nullable(),
  status: z.enum(['draft', 'confirmed', 'generating', 'failed']),
  linked_issue_numbers: z.array(z.number()),
  action_items: z.array(ActionItemSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

const authorExample = {
  id: 'uuid-user-1',
  github_username: 'jiyun-dev',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
};

const detailExample = {
  id: 'uuid-minutes-1',
  room_id: 'uuid-room-1',
  meeting_id: 'uuid-meeting-1',
  title: '스프린트 1주차 회의록',
  type: 'meeting',
  content_md: '## 논의 사항\n- socket.io 도입 결정',
  action_items: [
    {
      title: '로그인 API 구현',
      body: 'JWT 기반 인증 로직 작성 (지윤)',
      labels: ['backend'],
    },
    {
      title: '디자인 시안 공유',
      body: '로그인 화면 시안 업로드 (수아)',
      labels: [],
    },
  ],
  status: 'confirmed',
  linked_issue_numbers: [12, 15],
  author: authorExample,
  created_at: '2026-05-18T14:00:00.000Z',
  updated_at: '2026-05-18T15:30:00.000Z',
};

// ─── GET /rooms/:roomId/minutes ────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/minutes',
  tags: ['Minutes'],
  summary: '회의록 목록 조회',
  description:
    '해당 룸의 회의록 목록을 최신순으로 페이지네이션하여 반환합니다. ' +
    '`type` 으로 종류별 필터링이 가능합니다. ' +
    '룸 멤버만 호출 가능하며, 비멤버 접근 시 룸 존재를 숨기기 위해 ROOM_NOT_FOUND 로 응답합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.commonParams,
    query: MinutesSchema.getMinutesListQuery,
  },
  responses: {
    200: {
      description: '회의록 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              minutes: z.array(MinutesListItemSchema),
              pagination: z.object({
                page: z.number(),
                limit: z.number(),
                total_pages: z.number(),
                total_count: z.number(),
              }),
            }),
          }),
          example: {
            success: true,
            data: {
              minutes: [
                {
                  id: 'uuid-minutes-1',
                  title: '스프린트 1주차 회의록',
                  type: 'meeting',
                  status: 'confirmed',
                  author: authorExample,
                  linked_issue_numbers: [12, 15],
                  created_at: '2026-05-18T14:00:00.000Z',
                  updated_at: '2026-05-18T15:30:00.000Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 5,
                total_pages: 3,
                total_count: 12,
              },
            },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음 (또는 멤버가 아님)',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/minutes ───────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/minutes',
  tags: ['Minutes'],
  summary: '회의록 수동 작성',
  description:
    '사용자가 직접 회의록을 작성합니다. 회의(meeting)와 연결되지 않으며 meeting_id 는 null 입니다. ' +
    '룸 멤버만 호출 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.commonParams,
    body: {
      content: {
        'application/json': {
          schema: MinutesSchema.createManualMinutesBody,
          example: {
            title: '트러블슈팅 - CORS 이슈',
            type: 'troubleshooting',
            content_md: '## 원인\n- credentials 설정 누락',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: '회의록 작성 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: MinutesMutationResultSchema,
          }),
          example: {
            success: true,
            data: {
              id: 'uuid-minutes-2',
              room_id: 'uuid-room-1',
              meeting_id: null,
              author_id: 'uuid-user-1',
              title: '트러블슈팅 - CORS 이슈',
              type: 'troubleshooting',
              content_md: '## 원인\n- credentials 설정 누락',
              status: 'draft',
              linked_issue_numbers: [],
              action_items: [],
              created_at: '2026-05-18T16:00:00.000Z',
              updated_at: '2026-05-18T16:00:00.000Z',
            },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸을 찾을 수 없음 (또는 멤버가 아님)',
      'ROOM_NOT_FOUND',
      '룸을 찾을 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/minutes/generate ──────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/minutes/generate',
  tags: ['Minutes'],
  summary: 'AI 회의록 생성 요청',
  description:
    '종료된 회의(meeting)를 기반으로 AI 회의록 생성을 백그라운드 작업으로 트리거합니다. ' +
    "즉시 status='generating' 상태의 임시 회의록을 생성해 202로 반환하며, " +
    '동시에 소켓 이벤트(minutes:generation-started)를 발행합니다. ' +
    '백그라운드 작업이 끝나면 성공 시 minutes:generated(status=draft), ' +
    '실패 시 minutes:generation-failed(status=failed) 소켓 이벤트로 알립니다. ' +
    '제목을 지정하지 않으면 AI가 회의 내용을 바탕으로 제목을 생성합니다. ' +
    '회의가 존재하지 않거나 다른 룸의 회의면 MEETING_NOT_FOUND(404), ' +
    '해당 회의에 이미 회의록이 있으면 MINUTES_ALREADY_EXISTS(409)를 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.commonParams,
    body: {
      content: {
        'application/json': {
          schema: MinutesSchema.generateAiMinutesBody,
          example: {
            meeting_id: 'uuid-meeting-1',
            title: '스프린트 1주차 회의록',
          },
        },
      },
    },
  },
  responses: {
    202: {
      description: 'AI 회의록 생성 요청 접수 (백그라운드 진행)',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: MinutesMutationResultSchema,
          }),
          example: {
            success: true,
            message: 'AI 회의록 생성이 백그라운드에서 진행중입니다.',
            data: {
              id: 'uuid-minutes-3',
              room_id: 'uuid-room-1',
              meeting_id: 'uuid-meeting-1',
              author_id: 'uuid-user-1',
              title: '스프린트 1주차 회의록',
              type: 'meeting',
              content_md: null,
              status: 'generating',
              linked_issue_numbers: [],
              action_items: [],
              created_at: '2026-05-18T17:00:00.000Z',
              updated_at: '2026-05-18T17:00:00.000Z',
            },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸 또는 회의를 찾을 수 없음',
      'MEETING_NOT_FOUND',
      '회의를 찾을 수 없습니다.',
    ),
    409: errorResponse(
      '해당 회의에 회의록이 이미 존재함',
      'MINUTES_ALREADY_EXISTS',
      '해당 회의에 대한 회의록이 이미 존재합니다.',
    ),
  },
});

// ─── GET /rooms/:roomId/minutes/:minutesId ─────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/minutes/{minutesId}',
  tags: ['Minutes'],
  summary: '회의록 상세 조회',
  description:
    '회의록 단건을 본문(content_md)·액션 아이템·작성자 정보와 함께 반환합니다. ' +
    '룸 멤버만 호출 가능합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.detailParams,
  },
  responses: {
    200: {
      description: '회의록 상세 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: MinutesDetailSchema,
          }),
          example: { success: true, data: detailExample },
        },
      },
    },
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸/회의록을 찾을 수 없음 (또는 멤버가 아님)',
      'MINUTES_NOT_FOUND',
      '회의록을 찾을 수 없습니다.',
    ),
  },
});

// ─── PATCH /rooms/:roomId/minutes/:minutesId ───────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}/minutes/{minutesId}',
  tags: ['Minutes'],
  summary: '회의록 수정',
  description:
    '회의록의 제목·종류·본문·액션 아이템·상태를 수정합니다. ' +
    '변경할 필드만 포함하면 되며, 최소 1개 이상의 필드가 필요합니다. ' +
    "AI 생성 중(status='generating')인 회의록은 수정할 수 없어 MINUTES_GENERATING(409)을 반환합니다.",
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.detailParams,
    body: {
      content: {
        'application/json': {
          schema: MinutesSchema.updateMinutesBody,
          example: {
            title: '스프린트 1주차 회의록 (확정)',
            status: 'confirmed',
            action_items: [
              {
                title: '로그인 API 구현',
                body: 'JWT 인증 로직',
                labels: ['backend'],
              },
            ],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: '회의록 수정 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({
              id: z.string(),
              room_id: z.string(),
              title: z.string(),
              type: z.enum(['meeting', 'troubleshooting', 'etc']),
              content_md: z.string().nullable(),
              action_items: z.array(ActionItemSchema),
              status: z.enum(['draft', 'confirmed', 'generating', 'failed']),
              linked_issue_numbers: z.array(z.number()),
              updated_at: z.string(),
            }),
          }),
          example: {
            success: true,
            message: '회의록이 성공적으로 수정되었습니다.',
            data: {
              id: 'uuid-minutes-1',
              room_id: 'uuid-room-1',
              title: '스프린트 1주차 회의록 (확정)',
              type: 'meeting',
              content_md: '## 논의 사항\n- socket.io 도입 결정',
              action_items: [
                {
                  title: '로그인 API 구현',
                  body: 'JWT 인증 로직',
                  labels: ['backend'],
                },
              ],
              status: 'confirmed',
              linked_issue_numbers: [12, 15],
              updated_at: '2026-05-18T18:00:00.000Z',
            },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
    404: errorResponse(
      '룸/회의록을 찾을 수 없음 (또는 멤버가 아님)',
      'MINUTES_NOT_FOUND',
      '회의록을 찾을 수 없습니다.',
    ),
    409: errorResponse(
      'AI 생성 중이라 수정 불가',
      'MINUTES_GENERATING',
      'AI가 회의록을 생성 중일 때는 수정할 수 없습니다.',
    ),
  },
});

// ─── POST /rooms/:roomId/minutes/:minutesId/ai-refine ──────────────────────
registry.registerPath({
  method: 'post',
  path: '/rooms/{roomId}/minutes/{minutesId}/ai-refine',
  tags: ['Minutes'],
  summary: 'AI 회의록 다듬기 (개발 중)',
  description:
    '프롬프트를 기반으로 회의록 본문을 AI로 재작성한 결과를 반환합니다. ' +
    '현재 구현 진행 중인 엔드포인트입니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: MinutesSchema.detailParams,
    body: {
      content: {
        'application/json': {
          schema: MinutesSchema.refineMinutesBody,
          example: { prompt: '액션 아이템을 더 구체적으로 정리해줘' },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'AI 다듬기 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              refined_content_md: z.string(),
            }),
          }),
          example: {
            success: true,
            data: { refined_content_md: 'AI 재생성 회의록' },
          },
        },
      },
    },
    400: errorResponse(
      '요청 형식이 올바르지 않음',
      'BAD_REQUEST',
      '요청 형식이 올바르지 않습니다.',
    ),
    401: errorResponse('인증 실패', 'UNAUTHORIZED', '인증이 필요합니다.'),
  },
});
