import { Router } from 'express';

import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { RoomIdParamsSchema } from '../private-room/private-room.schema.js';

import {
  endMeetingHandler,
  getMeetingChatsHandler,
  getMeetingsHandler,
  startMeetingHandler,
} from './meetings.controller.js';
import {
  MeetingChatsQuerySchema,
  MeetingParamsSchema,
  StartMeetingSchema,
} from './meetings.schema.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', validate(RoomIdParamsSchema, 'params'), getMeetingsHandler);
router.post(
  '/',
  validate(RoomIdParamsSchema, 'params'),
  validate(StartMeetingSchema, 'body'),
  startMeetingHandler,
);

router.get(
  '/:meetingId/chats',
  validate(MeetingParamsSchema, 'params'),
  validate(MeetingChatsQuerySchema, 'query'),
  getMeetingChatsHandler,
);
router.post(
  '/:meetingId/end',
  validate(MeetingParamsSchema, 'params'),
  endMeetingHandler,
);

export default router;
