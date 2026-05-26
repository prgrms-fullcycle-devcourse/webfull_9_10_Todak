import { z } from 'zod';

const GetNotificationsSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
  }),
  query: z.object({
    unread_only: z.enum(['true', 'false']).optional().default('false'),
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
  }),
});

export const NotificationsSchema = {
  getNotificationsSchema: GetNotificationsSchema,
};

export type GetNotificationsParams = z.infer<
  typeof NotificationsSchema.getNotificationsSchema
>['params'];

export type GetNotificationsQuery = {
  unread_only?: 'true' | 'false';
  page?: string;
  limit?: string;
};
