import { z } from 'zod';

export const NotificationsSchema = {
  getNotificationsSchema: z.object({
    params: z.object({
      roomId: z.uuid(),
    }),
    query: z.object({
      unread_only: z.enum(['true', 'false']).optional().default('false'),
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
    }),
  }),

  updateNotificationsReadSchema: z.object({
    params: z.object({
      roomId: z.uuid(),
    }),
    body: z.object({
      notification_ids: z.array(z.uuid()).optional(),
    }),
  }),

  deleteNotificationsSchema: z.object({
    params: z.object({
      roomId: z.uuid(),
    }),
    query: z.object({
      all: z.enum(['true', 'false']).optional().default('true'), // 기본값은 싹 다 삭제
    }),
  }),
};

export type GetNotificationsParams = z.infer<
  typeof NotificationsSchema.getNotificationsSchema
>['params'];

export type GetNotificationsQuery = {
  unread_only?: 'true' | 'false';
  page?: string;
  limit?: string;
};

export type UpdateNotificationsReadParams = z.infer<
  typeof NotificationsSchema.updateNotificationsReadSchema
>['params'];

export type UpdateNotificationsReadBody = z.infer<
  typeof NotificationsSchema.updateNotificationsReadSchema
>['body'];

export type DeleteNotificationsParams = z.infer<
  typeof NotificationsSchema.deleteNotificationsSchema
>['params'];

export type DeleteNotificationsQuery = {
  all?: 'true' | 'false';
};
