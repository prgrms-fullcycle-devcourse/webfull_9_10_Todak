import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { createRepo } from './repos.controller.js';
import { CreateRepoSchema } from './repos.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateRepoSchema), createRepo);

export default router;
