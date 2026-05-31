import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const MeetingParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: 'uuid-room-1',
  }),
  meetingId: z.string().uuid().openapi({
    description: '회의 ID',
    example: 'uuid-meeting-1',
  }),
});

export const StartMeetingSchema = z.object({
  private_room_id: z.string().uuid().openapi({
    description: '회의를 시작할 프라이빗 룸 ID',
    example: 'uuid-private-room-1',
  }),
});

export type StartMeetingBody = z.infer<typeof StartMeetingSchema>;

export const MeetingChatsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).optional().openapi({
    description: '최대 채팅 개수 (기본: 전체)',
    example: 100,
  }),
});

export type MeetingChatsQuery = z.infer<typeof MeetingChatsQuerySchema>;

export const MeetingSchema = registry.register(
  'Meeting',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-meeting-1' }),
    status: z
      .enum(['ongoing', 'ended', 'cancelled'])
      .openapi({ example: 'ended' }),
    started_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:02:00.000Z' }),
    ended_at: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2026-05-18T14:32:00.000Z' }),
    participant_count: z.number().int().openapi({ example: 3 }),
    message_count: z.number().int().openapi({ example: 22 }),
    minutes_id: z
      .string()
      .uuid()
      .nullable()
      .openapi({ example: 'uuid-minutes-1' }),
  }),
);

export const StartMeetingResponseSchema = registry.register(
  'StartMeetingResponse',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-meeting-1' }),
    status: z.enum(['ongoing']).openapi({ example: 'ongoing' }),
    started_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:02:00.000Z' }),
    participants: z
      .array(z.string().uuid())
      .openapi({ example: ['uuid-user-1', 'uuid-user-2'] }),
  }),
);

export const EndMeetingResponseSchema = registry.register(
  'EndMeetingResponse',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-meeting-1' }),
    status: z.enum(['ended']).openapi({ example: 'ended' }),
    ended_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:32:00.000Z' }),
    message_count: z.number().int().openapi({ example: 22 }),
  }),
);

export const MeetingChatSchema = registry.register(
  'MeetingChat',
  z.object({
    id: z.string().uuid().openapi({ example: 'uuid-chat-1' }),
    user: z.object({
      github_username: z.string().openapi({ example: 'jiyun-dev' }),
      avatar_url: z
        .string()
        .nullable()
        .openapi({ example: 'https://avatars.githubusercontent.com/u/1?v=4' }),
    }),
    content: z
      .string()
      .nullable()
      .openapi({ example: '채팅 컴포넌트 PR 리뷰 반영 다 됐어요' }),
    type: z
      .enum(['text', 'meeting_start', 'meeting_end'])
      .openapi({ example: 'text' }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T14:05:00.000Z' }),
  }),
);
