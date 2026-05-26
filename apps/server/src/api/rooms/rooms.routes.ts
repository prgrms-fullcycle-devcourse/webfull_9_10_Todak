import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import './private-room/private-room.swagger.js';
import privateRoomRoutes from './private-room/private-room.routes.js';
import { createRoomHandler } from './rooms.controller.js';
import { CreateRoomSchema } from './rooms.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateRoomSchema), createRoomHandler);
router.use('/:roomId/private-room', privateRoomRoutes);

export default router;
