import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { RoomIdParamsSchema } from '../private-room/private-room.schema.js';

import {
  createAttachmentUploadUrlHandler,
  getMainRoomChatsHandler,
} from './chat.controller.js';
import { AttachmentUploadSchema, ChatsQuerySchema } from './chat.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  validate(RoomIdParamsSchema, 'params'),
  validate(ChatsQuerySchema, 'query'),
  getMainRoomChatsHandler,
);

router.post(
  '/attachments',
  validate(RoomIdParamsSchema, 'params'),
  validate(AttachmentUploadSchema, 'body'),
  createAttachmentUploadUrlHandler,
);

export default router;
