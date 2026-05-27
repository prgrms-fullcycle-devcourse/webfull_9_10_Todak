import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import { setupRoomMemberHandler } from './members.controller.js';
import { RoomIdParamsSchema, SetupRoomMemberSchema } from './members.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  '/setup',
  validate(RoomIdParamsSchema, 'params'),
  validate(SetupRoomMemberSchema),
  setupRoomMemberHandler,
);

export default router;
