import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import { createTodosHandler } from './todos.controller.js';
import { CreateTodosSchema } from './todos.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', validate(CreateTodosSchema), createTodosHandler);

export default router;
