import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  getPullRequestDetailHandler,
  getPullRequestsHandler,
} from './prs.controller.js';
import {
  GetPullRequestDetailParamsSchema,
  GetPullRequestsQuerySchema,
} from './prs.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  validate(GetPullRequestsQuerySchema, 'query'),
  getPullRequestsHandler,
);

router.get(
  '/:pullNumber',
  validate(GetPullRequestDetailParamsSchema, 'params'),
  getPullRequestDetailHandler,
);

export default router;
