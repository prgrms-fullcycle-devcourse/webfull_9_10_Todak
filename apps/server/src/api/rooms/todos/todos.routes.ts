import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import { createTodosHandler, getTodosHandler } from './todos.controller.js';
import { CreateTodosSchema, GetTodosQuerySchema } from './todos.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', validate(GetTodosQuerySchema, 'query'), getTodosHandler);
router.post('/', validate(CreateTodosSchema), createTodosHandler);

export default router;
