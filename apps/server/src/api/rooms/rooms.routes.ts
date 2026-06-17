import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { strictLimiter } from '../../middleware/rateLimit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import './members/members.swagger.js';
import chatRoutes from './chat/chat.routes.js';
import './meetings/meetings.swagger.js';
import meetingsRoutes from './meetings/meetings.routes.js';
import membersRoutes from './members/members.routes.js';
import './private-room/private-room.swagger.js';
import './chat/chat.swagger.js';
import privateRoomRoutes from './private-room/private-room.routes.js';
import './prs/prs.swagger.js';
import prsRoutes from './prs/prs.routes.js';
import './repo/repo.swagger.js';
import './repo/collaborators.swagger.js';
import './todos/todos.swagger.js';
import repoRoutes from './repo/repo.routes.js';
import {
  createRoomHandler,
  deleteRoomHandler,
  getRoomByIdHandler,
  getRoomPublicInfoHandler,
  getRoomsHandler,
  joinRoomHandler,
  leaveRoomHandler,
  updateRoomHandler,
} from './rooms.controller.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  UpdateRoomSchema,
} from './rooms.schema.js';
import todosRoutes from './todos/todos.routes.js';

const router = Router();

// 인증 불필요 — 링크 공유 시 OG 미리보기용 공개 정보
router.get('/:roomId/public', getRoomPublicInfoHandler);

router.use(requireAuth);

router.get('/', getRoomsHandler);
router.post('/', validate(CreateRoomSchema), createRoomHandler);
router.post('/join', strictLimiter, validate(JoinRoomSchema), joinRoomHandler);
router.get('/:roomId', getRoomByIdHandler);
router.patch('/:roomId', validate(UpdateRoomSchema), updateRoomHandler);
router.delete('/:roomId', deleteRoomHandler);
router.post('/:roomId/leave', leaveRoomHandler);
router.use('/:roomId/members', membersRoutes);
router.use('/:roomId/private-room', privateRoomRoutes);
router.use('/:roomId/chats', chatRoutes);
router.use('/:roomId/meetings', meetingsRoutes);
router.use('/:roomId/todos', todosRoutes);
router.use('/:roomId/prs', prsRoutes);
router.use('/:roomId/repo', repoRoutes);

export default router;
