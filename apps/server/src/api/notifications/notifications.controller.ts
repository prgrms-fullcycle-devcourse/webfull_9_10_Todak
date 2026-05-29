import type { NextFunction, Response } from 'express';

import { NotificationsService } from '../../services/notifications.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

import {
  DeleteNotificationsParams,
  DeleteNotificationsQuery,
  GetNotificationsParams,
  GetNotificationsQuery,
  UpdateNotificationsReadBody,
  UpdateNotificationsReadParams,
} from './notifications.schema.js';

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

  public updateNotificationsRead = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as UpdateNotificationsReadParams;
      const { notification_ids } = req.body as UpdateNotificationsReadBody;
      const userId = req.user!.id;

      // ID 배열이 존재하고, 최소 1개 이상의 요소가 들어있을 때만 선택 읽음(false)으로 판별
      const isBulk = !notification_ids || notification_ids.length === 0;

      const updatedCount = await this.notificationsService.markAsRead(
        roomId,
        userId,
        { notificationIds: notification_ids },
      );

      return res.status(200).json({
        success: true,
        message: '요청한 알림들이 성공적으로 읽음 처리되었습니다.',
        data: {
          updated_count: updatedCount,
          is_bulk: isBulk,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteNotifications = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId } = req.params as DeleteNotificationsParams;
      const { all } = req.query as unknown as DeleteNotificationsQuery;
      const userId = req.user!.id;

      const deleteAll = all === 'true';

      const deletedCount =
        await this.notificationsService.deleteAllNotifications(roomId, userId, {
          deleteAll,
        });

      return res.status(200).json({
        success: true,
        message: '모든 알림 내역이 완전히 삭제되었습니다.',
        data: {
          deleted_count: deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
