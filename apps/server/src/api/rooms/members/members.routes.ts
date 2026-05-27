import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';

import {
  getRoomMembersHandler,
  setupRoomMemberHandler,
  updateRoomMemberHandler,
  updateMemberStatusHandler,
} from './members.controller.js';
import {
  RoomIdParamsSchema,
  SetupRoomMemberSchema,
  UpdateRoomMemberSchema,
  UpdateMemberStatusSchema,
} from './members.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', validate(RoomIdParamsSchema, 'params'), getRoomMembersHandler);
router.post(
  '/setup',
  validate(RoomIdParamsSchema, 'params'),
  validate(SetupRoomMemberSchema),
  setupRoomMemberHandler,
);
router.patch(
  '/me',
  validate(RoomIdParamsSchema, 'params'),
  validate(UpdateRoomMemberSchema),
  updateRoomMemberHandler,
);
router.patch(
  '/me/status',
  validate(RoomIdParamsSchema, 'params'),
  validate(UpdateMemberStatusSchema),
  updateMemberStatusHandler,
);

export default router;
