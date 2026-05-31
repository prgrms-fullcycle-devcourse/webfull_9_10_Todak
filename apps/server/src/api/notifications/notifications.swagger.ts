import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

import { NotificationsSchema } from './notifications.schema.js';

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
const NotificationItemSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  type: z.enum(['pr_opened', 'pr_merged', 'minutes_generated', 'new_issue']),
  message: z.string(),
  is_read: z.boolean(),
  link: z.string().nullable(),
  created_at: z.string(),
});

const notificationExample = {
  id: 'uuid-noti-1',
  room_id: 'uuid-room-1',
  type: 'minutes_generated',
  message: 'AI 회의록 생성이 완료되었습니다.',
  is_read: false,
  link: '/rooms/uuid-room-1/minutes/uuid-minutes-1',
  created_at: '2026-05-18T14:00:00.000Z',
};

// ─── GET /rooms/:roomId/notifications ──────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/rooms/{roomId}/notifications',
  tags: ['Notifications'],
  summary: '알림 목록 조회',
  description:
    '현재 로그인한 사용자의 해당 룸 알림 목록을 반환합니다. ' +
    '안 읽은 알림이 먼저, 그 안에서 최신순으로 정렬됩니다. ' +
    '`unread_only=true` 로 안 읽은 알림만 필터링할 수 있으며, ' +
    'cursor 가 아닌 page 기반 페이지네이션(`has_more` 로 다음 페이지 존재 여부 판단)을 사용합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: NotificationsSchema.roomParams,
    query: NotificationsSchema.getNotificationsQuery,
  },
  responses: {
    200: {
      description: '알림 목록 조회 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              notifications: z.array(NotificationItemSchema),
              pagination: z.object({
                current_page: z.number(),
                has_more: z.boolean(),
              }),
            }),
          }),
          example: {
            success: true,
            data: {
              notifications: [notificationExample],
              pagination: {
                current_page: 1,
                has_more: true,
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
  },
});

// ─── PATCH /rooms/:roomId/notifications ────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/rooms/{roomId}/notifications',
  tags: ['Notifications'],
  summary: '알림 읽음 처리',
  description:
    '알림을 읽음 처리합니다. `all: true` 면 해당 룸의 안 읽은 알림 전체를, ' +
    '`notification_ids` 를 전달하면 해당 알림만 읽음 처리합니다. ' +
    '둘 중 하나는 반드시 지정해야 하며(둘 다 없으면 400), ' +
    '이미 읽은 알림은 대상에서 제외되어 실제로 변경된 개수만 반환됩니다. ' +
    'is_bulk 는 all=true(전체 읽음) 여부를 나타냅니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: NotificationsSchema.roomParams,
    body: {
      content: {
        'application/json': {
          schema: NotificationsSchema.updateNotificationsReadBody,
          examples: {
            선택_읽음: {
              summary: '선택한 알림만 읽음',
              value: { notification_ids: ['uuid-noti-1', 'uuid-noti-2'] },
            },
            전체_읽음: {
              summary: '안 읽은 알림 전체 읽음',
              value: { all: true },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: '읽음 처리 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({
              updated_count: z.number(),
              is_bulk: z.boolean(),
            }),
          }),
          example: {
            success: true,
            message: '요청한 알림들이 성공적으로 읽음 처리되었습니다.',
            data: { updated_count: 2, is_bulk: false },
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

// ─── DELETE /rooms/:roomId/notifications ───────────────────────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/notifications',
  tags: ['Notifications'],
  summary: '알림 일괄 삭제',
  description:
    '해당 룸의 내 알림을 일괄 삭제(물리 삭제)합니다. ' +
    '`all=true`면 전체, 미지정 또는 `all=false`(기본값)면 읽은 알림만 삭제합니다. ' +
    '(실수로 전체가 삭제되는 것을 막기 위해 기본값은 읽은 알림만 삭제입니다.) ' +
    '실제로 삭제된 개수를 반환합니다.',
  security: [{ bearerAuth: [] }],
  request: {
    params: NotificationsSchema.roomParams,
    query: NotificationsSchema.deleteNotificationsQuery,
  },
  responses: {
    200: {
      description: '알림 일괄 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({
              deleted_count: z.number(),
            }),
          }),
          example: {
            success: true,
            message: '모든 알림 내역이 삭제되었습니다.',
            data: { deleted_count: 5 },
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

// ─── DELETE /rooms/:roomId/notifications/:notificationId ───────────────────
registry.registerPath({
  method: 'delete',
  path: '/rooms/{roomId}/notifications/{notificationId}',
  tags: ['Notifications'],
  summary: '알림 단건 삭제',
  description:
    '특정 알림 1건을 삭제(물리 삭제)합니다. 본인 소유 + 해당 룸의 알림만 삭제됩니다. ' +
    '대상이 없으면(이미 삭제됐거나 내 알림이 아니면) deleted_count 0 으로 응답합니다(idempotent).',
  security: [{ bearerAuth: [] }],
  request: {
    params: NotificationsSchema.deleteNotificationParamsSchema,
  },
  responses: {
    200: {
      description: '알림 단건 삭제 성공',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({
              deleted_count: z.number(),
            }),
          }),
          example: {
            success: true,
            message: '알림이 성공적으로 삭제되었습니다.',
            data: { deleted_count: 1 },
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
