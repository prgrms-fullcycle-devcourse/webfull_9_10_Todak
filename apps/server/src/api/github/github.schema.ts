import { z } from 'zod';

import { registry } from '../../schema/openapi.js';

export const RepoParamsSchema = registry.register(
  'RepoParams',
  z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
);

export const PullRequestParamsSchema = registry.register(
  'PullRequestParams',
  z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pullNumber: z.coerce.number().int().positive(),
  }),
);
