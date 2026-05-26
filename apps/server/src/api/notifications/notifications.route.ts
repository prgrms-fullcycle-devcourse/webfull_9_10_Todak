import { requireAuth } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validate.middleware.js';
import { Router } from 'express';

import { NotificationsController } from './notifications.controller.js';
import { NotificationsSchema } from './notifications.schema.js';

const router = Router();
const controller = new NotificationsController();

router.use(requireAuth);

router
  .route('/')
  .get(
    validate(NotificationsSchema.getNotificationsSchema),
    controller.getNotificationsList,
  );

export default router;
