import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const ChatsQuerySchema = z.object({
  before: z.string().datetime().optional().openapi({
    description: '이 시각 이전 채팅을 조회 (페이지네이션 커서)',
    example: '2026-05-18T14:00:00.000Z',
  }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .openapi({ description: '최대 채팅 개수', example: 50 }),
});

export type ChatsQuery = z.infer<typeof ChatsQuerySchema>;

/*
 * 첨부 업로드 URL 발급 요청. 실제 형식/용량 허용 여부는
 * attachment.service.assertAllowedAttachment 에서 검증한다 (여기선 기본 형식만).
 */
export const AttachmentUploadSchema = z.object({
  mime: z.string().min(1).max(255).openapi({ example: 'image/png' }),
  size: z
    .number()
    .int()
    .positive()
    .openapi({ description: '파일 크기(바이트)', example: 204800 }),
});

export type AttachmentUploadBody = z.infer<typeof AttachmentUploadSchema>;

const ChatUserSchema = z.object({
  github_username: z.string().openapi({ example: 'jiyun-dev' }),
  avatar_url: z
    .string()
    .nullable()
    .openapi({ example: 'https://avatars.githubusercontent.com/u/1?v=4' }),
});

const ChatReactionSummarySchema = z.object({
  emoji: z.string().openapi({ example: '👍' }),
  count: z.number().int().openapi({ example: 3 }),
  me: z.boolean().openapi({
    description: '요청한 유저가 이 이모지를 눌렀는지',
    example: true,
  }),
});

const ChatAttachmentSchema = z.object({
  url: z.string().openapi({
    description: '조회용 presigned URL (만료 있음)',
    example: 'https://team03-s3-chat-attachments.s3.../chat/...?X-Amz-...',
  }),
  mime: z.string().openapi({ example: 'image/png' }),
  size: z.number().int().openapi({ description: '바이트', example: 204800 }),
  name: z.string().openapi({ example: 'screenshot.png' }),
});

export const ChatSchema = registry.register(
  'Chat',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-chat-1' }),
    user: ChatUserSchema,
    content: z.string().nullable().openapi({ example: 'socket.io 어떨까요?' }),
    type: z
      .enum(['text', 'meeting_start', 'meeting_end'])
      .openapi({ example: 'text' }),
    attachments: z.array(ChatAttachmentSchema).openapi({
      description: '이미지/PDF 첨부 (없으면 빈 배열, 한 메시지에 여러 개 가능)',
    }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:04:00.000Z' }),
    reactions: z.array(ChatReactionSummarySchema),
  }),
);
