import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  repo_full_name: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식으로 입력해주세요.'),
  max_members: z.number().int().min(2).max(20).default(6),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
