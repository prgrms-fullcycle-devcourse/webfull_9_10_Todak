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

export const ChatSchema = registry.register(
  'Chat',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-chat-1' }),
    user: ChatUserSchema,
    content: z.string().nullable().openapi({ example: 'socket.io 어떨까요?' }),
    type: z
      .enum(['text', 'meeting_start', 'meeting_end'])
      .openapi({ example: 'text' }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:04:00.000Z' }),
    reactions: z.array(ChatReactionSummarySchema),
  }),
);
