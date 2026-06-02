import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';

interface GetNotificationsOptions {
  unreadOnly: boolean;
  page: number;
  limit: number;
}

interface MarkAsReadOptions {
  all?: boolean;
  notificationIds?: string[];
}

interface DeleteNotificationsOptions {
  deleteAll: boolean;
}

export class NotificationsService {
  /**
   * 특정 룸 내 현재 로그인한 유저의 알림 목록을 조건에 맞춰 조회합니다.
   */
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

  /**
   * 알림을 선택적으로 혹은 일괄적으로 읽음 처리합니다.
   */
  public markAsRead = async (
    roomId: string,
    userId: string,
    options: MarkAsReadOptions,
  ) => {
    const { all, notificationIds } = options;

    const whereClause: Prisma.NotificationWhereInput = {
      roomId,
      userId,
      isRead: false, // 이미 읽은 건 업데이트 대상에서 제외하여 count 최적화
    };

    /*
     * all=true가 아니면 지정된 ID만 대상으로 한정.
     * (ID가 비어 있으면 in:[]으로 아무것도 매칭되지 않아 실수로 전체가 읽음 처리되지 않음)
     */
    if (all !== true) {
      whereClause.id = {
        in: notificationIds ?? [],
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

  /**
   * 유저의 알림을 일괄 삭제(물리 삭제)합니다.
   */
  public deleteAllNotifications = async (
    roomId: string,
    userId: string,
    options: DeleteNotificationsOptions,
  ) => {
    const { deleteAll } = options;

    const whereClause: Prisma.NotificationWhereInput = {
      roomId,
      userId,
    };

    // deleteAll이 false라면 '읽은 알림(isRead: true)'만 타겟팅하여 삭제
    if (!deleteAll) {
      whereClause.isRead = true;
    }

    const result = await prisma.notification.deleteMany({
      where: whereClause,
    });

    return result.count; // 실제로 삭제된 레코드 수 반환
  };

  /**
   * 특정 알림 1건을 물리 삭제합니다. (본인 소유 + 해당 룸으로 한정)
   */
  public deleteNotification = async (
    roomId: string,
    userId: string,
    notificationId: string,
  ) => {
    const result = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        roomId,
        userId,
      },
    });

    return result.count; // 삭제된 레코드 수 (대상이 없으면 0)
  };
}
