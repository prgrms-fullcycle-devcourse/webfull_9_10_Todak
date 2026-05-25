import { z } from 'zod';

export const CreateRepoSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[\w.-]+$/,
      '레포지토리 이름은 영문, 숫자, -, _ 만 사용할 수 있습니다.',
    ),
  org: z.string().optional(),
  private: z.boolean().default(true),
  auto_init: z.boolean().default(true),
});

export type CreateRepoInput = z.infer<typeof CreateRepoSchema>;
