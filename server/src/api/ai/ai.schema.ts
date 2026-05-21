import { z } from 'zod';

import { registry } from '../../schema/openapi';

export const CodeReviewRequestSchema = registry.register(
  'CodeReviewRequest',
  z.object({
    code: z.string().min(1),
    context: z.string().optional(),
  }),
);

export const CodeReviewResponseSchema = registry.register(
  'CodeReviewResponse',
  z.object({
    jobId: z.string(),
    message: z.string(),
  }),
);
