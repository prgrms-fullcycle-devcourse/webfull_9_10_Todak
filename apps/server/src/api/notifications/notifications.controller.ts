import { AuthenticatedRequest } from '@/types/index.js';
import { NextFunction, Response } from 'express';

import {
  GetNotificationsParams,
  GetNotificationsQuery,
  UpdateNotificationsReadBody,
  UpdateNotificationsReadParams,
} from './notifications.schema.js';
import { NotificationsService } from './notifications.service.js';

export class NotificationsController {
  private notificationsService = new NotificationsService();

  /**
   * 특정 룸 내 현재 로그인한 유저의 알림 목록을 조건에 맞춰 조회합니다.
   */
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

  /**
   * 알림을 선택적으로 혹은 일괄적으로 읽음 처리합니다.
   */
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
}
