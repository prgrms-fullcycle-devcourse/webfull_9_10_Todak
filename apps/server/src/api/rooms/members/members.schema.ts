import { z } from 'zod';

import { registry } from '../../../schema/openapi.js';

export const CHARACTER_TYPES = [
  'cat',
  'dog',
  'rabbit',
  'hamster',
  'bear',
] as const;

export const ROLES = ['frontend', 'backend', 'design', 'pm'] as const;

export const RoomIdParamsSchema = z.object({
  roomId: z.string().uuid().openapi({
    description: '룸 ID',
    example: 'uuid-room-1',
  }),
});

export const SetupRoomMemberSchema = z.object({
  character_type: z.enum(CHARACTER_TYPES).openapi({
    description: '선택한 캐릭터',
    example: 'cat',
  }),
  nickname: z.string().trim().min(1).max(20).openapi({
    description: '룸 내 표시될 닉네임',
    example: '수정',
  }),
  roles: z
    .array(z.enum(ROLES))
    .min(1, '역할/파트를 1개 이상 선택해주세요.')
    .openapi({
      description: '역할/파트 (중복 선택 가능)',
      example: ['frontend', 'backend'],
    }),
  detailed_role: z.string().trim().min(1).max(50).optional().openapi({
    description: '세부 직군 (예: Frontend Developer)',
    example: 'Frontend Developer',
  }),
});

export type SetupRoomMemberInput = z.infer<typeof SetupRoomMemberSchema>;

export const RoomMemberResponseSchema = registry.register(
  'RoomMember',
  z.object({
    github_username: z.string().openapi({ example: 'jiyun-dev' }),
    avatar_url: z
      .string()
      .nullable()
      .openapi({ example: 'https://avatars.githubusercontent.com/u/1234' }),
    roles: z.array(z.string()).openapi({ example: ['frontend', 'backend'] }),
    detailed_role: z
      .string()
      .nullable()
      .openapi({ example: 'Frontend Developer' }),
    character_type: z.string().nullable().openapi({ example: 'cat' }),
    nickname: z.string().nullable().openapi({ example: '수정' }),
    status: z.string().openapi({ example: 'focus' }),
    is_host: z.boolean().openapi({ example: false }),
    pos_x: z.number().openapi({ example: 0 }),
    pos_y: z.number().openapi({ example: 0 }),
  }),
);
