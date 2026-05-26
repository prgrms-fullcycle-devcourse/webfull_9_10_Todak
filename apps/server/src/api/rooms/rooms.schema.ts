import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  repo_full_name: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식으로 입력해주세요.'),
  max_members: z.number().int().min(2).max(20).default(6),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const JoinRoomSchema = z.object({
  invite_code: z
    .string()
    .regex(
      /^[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      'XXXX-XXXX 형식의 초대 코드를 입력해주세요.',
    ),
});

export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;

export const UpdateRoomSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    max_members: z.number().int().min(2).max(20).optional(),
  })
  .refine(data => data.name !== undefined || data.max_members !== undefined, {
    message: '수정할 항목을 하나 이상 입력해주세요.',
  });

export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
