import { Router } from 'express';

import {
  getPrivateRoomsHandler,
  enterPrivateRoomHandler,
  leavePrivateRoomHandler,
} from './private-room.controller.js';

const router = Router({ mergeParams: true });

router.get('/', getPrivateRoomsHandler);
router.post('/:privateRoomId/enter', enterPrivateRoomHandler);
router.post('/:privateRoomId/leave', leavePrivateRoomHandler);

export default router;
