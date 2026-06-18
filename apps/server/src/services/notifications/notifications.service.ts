import { Prisma } from '@/generated/prisma/client/index.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';
import { getIO } from '@/socket/index.js';

/*
 * 알림 producer 공용 헬퍼.
 * - 영속이 필요한 도메인 이벤트(PR/이슈/회의록/회의)에서 호출한다.
 * - DB Notification insert + 대상 유저 개인방으로 notification:created emit 를 함께 수행.
 * - 휘발성 토스트로 충분한 이벤트(채팅/presence 등)는 여기서 만들지 않는다.
 */
interface NotificationCreateData {
  roomId: string;
  type: string;
  message: string;
  link?: string | null;
}

// 룸 전체 멤버 userId
export async function getRoomMemberIds(roomId: string): Promise<string[]> {
  const members = await prisma.roomMember.findMany({
    where: { roomId },
    select: { userId: true },
  });

  return members.map(m => m.userId);
}

// 회의 참여자 userId (중도 퇴장자 포함, 재입장 중복 제거)
export async function getMeetingParticipantIds(
  meetingId: string,
): Promise<string[]> {
  const participants = await prisma.meetingParticipant.findMany({
    where: { meetingId },
    select: { userId: true },
  });

  return [...new Set(participants.map(p => p.userId))];
}

// GitHub login → 룸 멤버 userId (외부 협업자/미매핑이면 null) — 행위자 제외용
export async function resolveMemberIdByLogin(
  roomId: string,
  login: string | null | undefined,
): Promise<string | null> {
  if (login === null || login === undefined || login === '') {
    return null;
  }

  const member = await prisma.roomMember.findFirst({
    where: { roomId, user: { githubUsername: login } },
    select: { userId: true },
  });

  return member?.userId ?? null;
}

/*
 * 대상 유저들에게 알림 생성(DB insert) + 개인방(userId)으로 notification:created emit.
 * - 중복 userId 제거. 수신자 0명이면 아무것도 하지 않는다(no-op).
 * - 응답 포맷은 getNotificationsList 항목과 동일 snake_case.
 *
 * best-effort: 알림은 부차적 side-effect 이므로 어떤 실패도 호출부(웹훅/워커/컨트롤러)의
 * 핵심 흐름을 깨지 않는다. 실패는 유저 단위로 격리(allSettled)해 로깅만 하고, 이 함수는
 * 절대 throw 하지 않는다. (웹훅에서 throw 시 dedup 해제→재시도→알림 중복 생성 방지)
 */
export async function createNotifications(
  targetUserIds: string[],
  data: NotificationCreateData,
): Promise<void> {
  const uniqueIds = [...new Set(targetUserIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const io = getIO();

  const results = await Promise.allSettled(
    uniqueIds.map(async userId => {
      const created = await prisma.notification.create({
        data: {
          roomId: data.roomId,
          userId,
          type: data.type,
          message: data.message,
          link: data.link ?? null,
        },
      });

      io.to(userId).emit('notification:created', {
        id: created.id,
        room_id: created.roomId,
        type: created.type,
        message: created.message,
        is_read: created.isRead,
        link: created.link,
        created_at: created.createdAt.toISOString(),
      });
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(
        { err: result.reason },
        `❌ 알림 생성 실패 (type=${data.type}, room=${data.roomId})`,
      );
    }
  }
}

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
