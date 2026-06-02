import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { strictLimiter } from '../../middleware/rateLimit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { createRepo, deleteRepoHandler } from './repos.controller.js';
import { CreateRepoSchema } from './repos.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/', strictLimiter, validate(CreateRepoSchema), createRepo);
router.delete('/:repoId', strictLimiter, deleteRepoHandler);

export default router;
