import { Router } from 'express';

import { requireAuth } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validate.middleware.js';

import {
  getPrivateRoomsHandler,
  enterPrivateRoomHandler,
  leavePrivateRoomHandler,
} from './private-room.controller.js';
import {
  PrivateRoomParamsSchema,
  RoomIdParamsSchema,
} from './private-room.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', validate(RoomIdParamsSchema, 'params'), getPrivateRoomsHandler);
router.post(
  '/:privateRoomId/enter',
  validate(PrivateRoomParamsSchema, 'params'),
  enterPrivateRoomHandler,
);
router.post(
  '/:privateRoomId/leave',
  validate(PrivateRoomParamsSchema, 'params'),
  leavePrivateRoomHandler,
);

export default router;
