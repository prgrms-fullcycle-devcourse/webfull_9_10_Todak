import { Router } from 'express';

import { getPrivateRoomsHandler } from './private-room.controller.js';

const router = Router({ mergeParams: true });

router.get('/', getPrivateRoomsHandler);

export default router;
