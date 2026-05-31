import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { NotificationsController } from './notifications.controller.js';
import { NotificationsSchema } from './notifications.schema.js';

const router = Router({ mergeParams: true });
const controller = new NotificationsController();

router.use(requireAuth);

/**
 * 엔드포인트: /rooms/:roomId/notifications
 */
router
  .route('/')
  .get(
    validate(NotificationsSchema.roomParams, 'params'),
    validate(NotificationsSchema.getNotificationsQuery, 'query'),
    controller.getNotificationsList,
  )
  .patch(
    validate(NotificationsSchema.roomParams, 'params'),
    validate(NotificationsSchema.updateNotificationsReadBody, 'body'),
    controller.updateNotificationsRead,
  )
  .delete(
    validate(NotificationsSchema.roomParams, 'params'),
    validate(NotificationsSchema.deleteNotificationsQuery, 'query'),
    controller.deleteNotifications,
  );

/**
 * 엔드포인트: /rooms/:roomId/notifications/:notificationId
 */
router.delete(
  '/:notificationId',
  validate(NotificationsSchema.deleteNotificationParamsSchema, 'params'),
  controller.deleteNotification,
);

export default router;
