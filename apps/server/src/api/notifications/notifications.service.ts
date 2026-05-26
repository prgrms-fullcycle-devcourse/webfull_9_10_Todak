import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';

interface GetNotificationsOptions {
  unreadOnly: boolean;
  page: number;
  limit: number;
}

interface MarkAsReadOptions {
  notificationIds?: string[];
}

export class NotificationsService {
  public getNotificationsList = async (
    roomId: string,
    userId: string,
    options: GetNotificationsOptions,
  ) => {
    const { unreadOnly, page, limit } = options;

    const whereClause: Prisma.NotificationWhereInput = {
      roomId,
      userId,
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit + 1,
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });

    const hasMore = notifications.length > limit;

    const slicedNotifications = hasMore
      ? notifications.slice(0, limit)
      : notifications;

    const formattedNotifications = slicedNotifications.map(notification => ({
      id: notification.id,
      room_id: notification.roomId,
      type: notification.type,
      message: notification.message,
      is_read: notification.isRead,
      link: notification.link,
      created_at: notification.createdAt.toISOString(),
    }));

    return {
      notifications: formattedNotifications,
      pagination: {
        current_page: page,
        has_more: hasMore,
      },
    };
  };

  public markAsRead = async (
    roomId: string,
    userId: string,
    options: MarkAsReadOptions,
  ) => {
    const { notificationIds } = options;

    const whereClause: Prisma.NotificationWhereInput = {
      roomId,
      userId,
      isRead: false, // 이미 읽은 건 업데이트 대상에서 제외하여 count 최적화
    };

    if (notificationIds && notificationIds.length > 0) {
      whereClause.id = {
        in: notificationIds,
      };
    }

    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
      },
    });

    return result.count; // 실제로 변경된 행의 개수 반환
  };
}
