import { z } from 'zod';

export const NotificationsSchema = {
  // 공통 params (부모 라우터에서 전달되는 roomId)
  roomParams: z.object({
    roomId: z.uuid(),
  }),

  // GET / 쿼리
  getNotificationsQuery: z.object({
    unread_only: z.enum(['true', 'false']).optional().default('false'),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(20),
  }),

  // PATCH / 바디 (읽음 처리할 알림 ID 목록, 없으면 전체 읽음)
  updateNotificationsReadBody: z.object({
    notification_ids: z.array(z.uuid()).optional(),
  }),

  // DELETE / 쿼리 (all=true 전체 삭제, false 읽은 것만)
  deleteNotificationsQuery: z.object({
    all: z.enum(['true', 'false']).optional().default('true'),
  }),

  // DELETE /:notificationId params (단건 삭제)
  deleteNotificationParamsSchema: z.object({
    roomId: z.uuid(),
    notificationId: z.uuid(),
  }),
};

export type GetNotificationsParams = z.infer<
  typeof NotificationsSchema.roomParams
>;
export type GetNotificationsQuery = z.infer<
  typeof NotificationsSchema.getNotificationsQuery
>;

export type UpdateNotificationsReadParams = z.infer<
  typeof NotificationsSchema.roomParams
>;
export type UpdateNotificationsReadBody = z.infer<
  typeof NotificationsSchema.updateNotificationsReadBody
>;

export type DeleteNotificationsParams = z.infer<
  typeof NotificationsSchema.roomParams
>;
export type DeleteNotificationsQuery = z.infer<
  typeof NotificationsSchema.deleteNotificationsQuery
>;

export type DeleteNotificationParams = z.infer<
  typeof NotificationsSchema.deleteNotificationParamsSchema
>;
