import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { strictLimiter } from '../../../middleware/rateLimit.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import collaboratorsRouter from './collaborators.routes.js';
import {
  connectRepoHandler,
  disconnectRepoHandler,
} from './repo.controller.js';
import { ConnectRepoSchema } from './repo.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.put('/', strictLimiter, validate(ConnectRepoSchema), connectRepoHandler);
router.delete('/', strictLimiter, disconnectRepoHandler);

router.use('/collaborators', collaboratorsRouter);

export default router;
