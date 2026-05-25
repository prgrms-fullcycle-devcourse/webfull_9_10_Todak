import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { createRoomHandler } from './rooms.controller.js';
import { CreateRoomSchema } from './rooms.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateRoomSchema), createRoomHandler);

export default router;
