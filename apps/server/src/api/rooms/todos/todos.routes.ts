import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  createTodosHandler,
  deleteTodoHandler,
  getMyTodosHandler,
  getTodoLabelsHandler,
  getTodosHandler,
  updateTodoHandler,
} from './todos.controller.js';
import {
  CreateTodosSchema,
  GetTodosQuerySchema,
  UpdateTodoSchema,
} from './todos.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/me', getMyTodosHandler);
router.get('/labels', getTodoLabelsHandler);
router.get('/', validate(GetTodosQuerySchema, 'query'), getTodosHandler);
router.post('/', validate(CreateTodosSchema), createTodosHandler);
router.patch('/:todoId', validate(UpdateTodoSchema), updateTodoHandler);
router.delete('/:todoId', deleteTodoHandler);

export default router;
