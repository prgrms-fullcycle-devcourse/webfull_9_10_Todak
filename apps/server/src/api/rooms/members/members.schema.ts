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

export const UpdateRoomMemberSchema = z
  .object({
    character_type: z.enum(CHARACTER_TYPES).optional().openapi({
      description: '변경할 캐릭터',
      example: 'dog',
    }),
    nickname: z.string().trim().min(1).max(20).optional().openapi({
      description: '변경할 닉네임',
      example: '엘리',
    }),
    roles: z
      .array(z.enum(ROLES))
      .min(1, '역할/파트를 1개 이상 선택해주세요.')
      .optional()
      .openapi({
        description: '변경할 역할/파트',
        example: ['frontend'],
      }),
    detailed_role: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .nullable()
      .optional()
      .openapi({
        description: '변경할 세부 직군 (null 전달 시 삭제)',
        example: 'UI Developer',
      }),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: '수정할 항목을 1개 이상 입력해주세요.',
  });

export type UpdateRoomMemberInput = z.infer<typeof UpdateRoomMemberSchema>;

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
