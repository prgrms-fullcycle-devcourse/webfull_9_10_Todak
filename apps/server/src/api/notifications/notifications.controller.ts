import type { NextFunction, Response } from 'express';

import { NotificationsService } from '../../services/notifications.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

import {
  DeleteNotificationParams,
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
      const { unread_only, page, limit } =
        req.query as unknown as GetNotificationsQuery;
      const userId = req.user!.id;

      const unreadOnly = unread_only === 'true';

      const { notifications, pagination } =
        await this.notificationsService.getNotificationsList(roomId, userId, {
          unreadOnly,
          page,
          limit,
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
      const { all, notification_ids } = req.body as UpdateNotificationsReadBody;
      const userId = req.user!.id;

      // all=true면 전체 읽음(bulk), 아니면 지정된 ID만 읽음
      const isBulk = all === true;

      const updatedCount = await this.notificationsService.markAsRead(
        roomId,
        userId,
        { all, notificationIds: notification_ids },
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
        message: deleteAll
          ? '모든 알림 내역이 삭제되었습니다.'
          : '읽은 알림 내역이 삭제되었습니다.',
        data: {
          deleted_count: deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteNotification = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { roomId, notificationId } = req.params as DeleteNotificationParams;
      const userId = req.user!.id;

      const deletedCount = await this.notificationsService.deleteNotification(
        roomId,
        userId,
        notificationId,
      );

      return res.status(200).json({
        success: true,
        message: '알림이 성공적으로 삭제되었습니다.',
        data: {
          deleted_count: deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
