import { z } from 'zod';

export const ConnectRepoSchema = z.object({
  repo_full_name: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식으로 입력해주세요.'),
});

export type ConnectRepoInput = z.infer<typeof ConnectRepoSchema>;
