import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import './members/members.swagger.js';
import membersRoutes from './members/members.routes.js';
import './private-room/private-room.swagger.js';
import './chat/chat.swagger.js';
import chatRoutes from './chat/chat.routes.js';
import privateRoomRoutes from './private-room/private-room.routes.js';
import {
  createRoomHandler,
  deleteRoomHandler,
  getRoomByIdHandler,
  getRoomsHandler,
  joinRoomHandler,
  updateRoomHandler,
} from './rooms.controller.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  UpdateRoomSchema,
} from './rooms.schema.js';

const router = Router();

router.use(requireAuth);

router.get('/', getRoomsHandler);
router.post('/', validate(CreateRoomSchema), createRoomHandler);
router.post('/join', validate(JoinRoomSchema), joinRoomHandler);
router.get('/:roomId', getRoomByIdHandler);
router.patch('/:roomId', validate(UpdateRoomSchema), updateRoomHandler);
router.delete('/:roomId', deleteRoomHandler);
router.use('/:roomId/members', membersRoutes);
router.use('/:roomId/private-room', privateRoomRoutes);
router.use('/:roomId/chats', chatRoutes);

export default router;
