import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';

interface GetNotificationsOptions {
  unreadOnly: boolean;
  page: number;
  limit: number;
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
}
