import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import { getPullRequestsHandler } from './prs.controller.js';
import { GetPullRequestsQuerySchema } from './prs.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  validate(GetPullRequestsQuerySchema, 'query'),
  getPullRequestsHandler,
);

export default router;
