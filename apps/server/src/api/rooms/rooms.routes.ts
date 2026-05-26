import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import './private-room/private-room.swagger.js';
import privateRoomRoutes from './private-room/private-room.routes.js';
import {
  createRoomHandler,
  deleteRoomHandler,
  getRoomByIdHandler,
  getRoomsHandler,
  joinRoomHandler,
} from './rooms.controller.js';
import { CreateRoomSchema, JoinRoomSchema } from './rooms.schema.js';

const router = Router();

router.use(requireAuth);

router.get('/', getRoomsHandler);
router.post('/', validate(CreateRoomSchema), createRoomHandler);
router.post('/join', validate(JoinRoomSchema), joinRoomHandler);
router.get('/:roomId', getRoomByIdHandler);
router.delete('/:roomId', deleteRoomHandler);
router.use('/:roomId/private-room', privateRoomRoutes);

export default router;
