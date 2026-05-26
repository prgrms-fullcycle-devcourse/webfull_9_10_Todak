import { AuthenticatedRequest } from '@/types/index.js';
import { NextFunction, Response } from 'express';

import {
  GetNotificationsParams,
  GetNotificationsQuery,
} from './notifications.schema.js';
import { NotificationsService } from './notifications.service.js';

export class NotificationsController {
  private notificationsService = new NotificationsService();

  public getNotificationsList = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as GetNotificationsParams;
      const { unread_only, page, limit } = req.query as GetNotificationsQuery;
      const userId = req.user!.id;

      const unreadOnly = unread_only === 'true';
      const parsedPage = parseInt(page ?? '1', 10);
      const parsedLimit = parseInt(limit ?? '20', 10);

      const { notifications, pagination } =
        await this.notificationsService.getNotificationsList(roomId, userId, {
          unreadOnly,
          page: parsedPage,
          limit: parsedLimit,
        });

      return res.status(200).json({
        success: true,
        data: {
          notifications,
          pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
