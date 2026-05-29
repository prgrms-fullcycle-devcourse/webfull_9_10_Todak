import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { createRepo, deleteRepoHandler } from './repos.controller.js';
import { CreateRepoSchema } from './repos.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateRepoSchema), createRepo);
router.delete('/:repoId', deleteRepoHandler);

export default router;
