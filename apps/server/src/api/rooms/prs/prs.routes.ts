import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  getPullRequestDetailHandler,
  getPullRequestsHandler,
  mergePullRequestHandler,
} from './prs.controller.js';
import {
  GetPullRequestDetailParamsSchema,
  GetPullRequestsQuerySchema,
  MergePullRequestBodySchema,
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

router.put(
  '/:pullNumber/merge',
  validate(GetPullRequestDetailParamsSchema, 'params'),
  validate(MergePullRequestBodySchema, 'body'),
  mergePullRequestHandler,
);

export default router;
