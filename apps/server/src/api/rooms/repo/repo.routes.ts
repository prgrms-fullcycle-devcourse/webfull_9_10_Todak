import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { strictLimiter } from '../../../middleware/rateLimit.middleware.js';

import { disconnectRepoHandler } from './repo.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.delete('/', strictLimiter, disconnectRepoHandler);

export default router;
