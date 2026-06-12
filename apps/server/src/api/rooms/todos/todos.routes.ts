import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  createTodoCommentHandler,
  createTodoLabelHandler,
  createTodoReactionHandler,
  createTodosHandler,
  deleteTodoCommentHandler,
  deleteTodoHandler,
  deleteTodoLabelHandler,
  deleteTodoReactionHandler,
  getMyTodosHandler,
  getTodoCommentsHandler,
  getTodoEventsHandler,
  getTodoHandler,
  getTodoLabelsHandler,
  getTodoMilestonesHandler,
  getTodosHandler,
  updateTodoCommentHandler,
  updateTodoHandler,
  updateTodoLabelHandler,
} from './todos.controller.js';
import {
  CreateCommentSchema,
  CreateLabelSchema,
  CreateReactionSchema,
  CreateTodosSchema,
  GetTodosQuerySchema,
  UpdateCommentSchema,
  UpdateLabelSchema,
  UpdateTodoSchema,
} from './todos.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// 정적 경로 — /:todoId 보다 먼저 등록
router.get('/me', getMyTodosHandler);
router.get('/milestones', getTodoMilestonesHandler);
router.get('/labels', getTodoLabelsHandler);
router.post('/labels', validate(CreateLabelSchema), createTodoLabelHandler);
router.patch(
  '/labels/:labelName',
  validate(UpdateLabelSchema),
  updateTodoLabelHandler,
);
router.delete('/labels/:labelName', deleteTodoLabelHandler);

// 목록 / 생성
router.get('/', validate(GetTodosQuerySchema, 'query'), getTodosHandler);
router.post('/', validate(CreateTodosSchema), createTodosHandler);

// 단건 조회 / 수정 / 삭제
router.get('/:todoId', getTodoHandler);
router.patch('/:todoId', validate(UpdateTodoSchema), updateTodoHandler);
router.delete('/:todoId', deleteTodoHandler);

// 댓글
router.get('/:todoId/comments', getTodoCommentsHandler);
router.post(
  '/:todoId/comments',
  validate(CreateCommentSchema),
  createTodoCommentHandler,
);
router.patch(
  '/:todoId/comments/:commentId',
  validate(UpdateCommentSchema),
  updateTodoCommentHandler,
);
router.delete('/:todoId/comments/:commentId', deleteTodoCommentHandler);

// 이벤트 타임라인
router.get('/:todoId/events', getTodoEventsHandler);

// 리액션
router.post(
  '/:todoId/reactions',
  validate(CreateReactionSchema),
  createTodoReactionHandler,
);
router.delete('/:todoId/reactions/:reactionId', deleteTodoReactionHandler);

export default router;
