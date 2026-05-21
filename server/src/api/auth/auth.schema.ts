import { z } from 'zod';

import { registry } from '../../schema/openapi';

export const GithubCallbackSchema = registry.register(
  'GithubCallback',
  z.object({
    code: z.string().min(1),
  }),
);

export const AuthResponseSchema = registry.register(
  'AuthResponse',
  z.object({
    token: z.string(),
    user: z.object({
      id: z.string(),
      login: z.string(),
      avatarUrl: z.string(),
    }),
  }),
);
