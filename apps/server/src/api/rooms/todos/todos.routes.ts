import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  createTodosHandler,
  deleteTodoHandler,
  getMyTodosHandler,
  getTodosHandler,
} from './todos.controller.js';
import { CreateTodosSchema, GetTodosQuerySchema } from './todos.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/me', getMyTodosHandler);
router.get('/', validate(GetTodosQuerySchema, 'query'), getTodosHandler);
router.post('/', validate(CreateTodosSchema), createTodosHandler);
router.delete('/:todoId', deleteTodoHandler);

export default router;
