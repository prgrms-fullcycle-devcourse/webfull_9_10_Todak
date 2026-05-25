import { z } from 'zod';

const GetMinutesListSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
  }),
  query: z.object({
    type: z.enum(['meeting', 'troubleshooting', 'etc']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(5),
  }),
});

const CreateManualMinutesSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
  }),
  body: z.object({
    title: z.string().trim().min(1),
    type: z.enum(['meeting', 'troubleshooting', 'etc']),
    content_md: z.string().default(''),
  }),
});

const GenerateAiMinutesSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
  }),
  body: z.object({
    meeting_id: z.string().min(1),
    title: z.string().min(1).optional(),
  }),
});

export const GetMinutesDetailSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
    minutesId: z.uuid(),
  }),
});

const UpdateMinutesSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
    minutesId: z.uuid(),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).optional(),
      type: z.enum(['meeting', 'troubleshooting', 'etc']).optional(),
      content_md: z.string().optional(),
      action_items: z.array(z.string()).optional(),
      status: z.enum(['draft', 'confirmed']).optional(),
    })
    .refine(data => Object.keys(data).length > 0),
});

const RefineMinutesSchema = z.object({
  params: z.object({
    roomId: z.uuid(),
    minutesId: z.uuid(),
  }),
  body: z.object({
    prompt: z.string().trim().min(1),
  }),
});

export const MinutesSchema = {
  getMinutesListSchema: GetMinutesListSchema,
  createManualMinutes: CreateManualMinutesSchema,
  generateAiMinutes: GenerateAiMinutesSchema,
  getMinutesDetailSchema: GetMinutesDetailSchema,
  updateMinutes: UpdateMinutesSchema,
  refineMinutes: RefineMinutesSchema,
};

export type GetMinutesListParams = z.infer<
  typeof GetMinutesListSchema
>['params'];
export type GetMinutesListQuery = z.infer<typeof GetMinutesListSchema>['query'];

export type CreateManualMinutesParams = z.infer<
  typeof CreateManualMinutesSchema
>['params'];
export type CreateManualMinutesBody = z.infer<
  typeof CreateManualMinutesSchema
>['body'];

export type GenerateAiMinutesParams = z.infer<
  typeof GenerateAiMinutesSchema
>['params'];
export type GenerateAiMinutesBody = z.infer<
  typeof GenerateAiMinutesSchema
>['body'];

export type GetMinutesDetailParams = z.infer<
  typeof GetMinutesDetailSchema
>['params'];

export type UpdateMinutesParams = z.infer<typeof UpdateMinutesSchema>['params'];
export type UpdateMinutesBody = z.infer<typeof UpdateMinutesSchema>['body'];

export type RefineMinutesParams = z.infer<typeof RefineMinutesSchema>['params'];
export type RefineMinutesBody = z.infer<typeof RefineMinutesSchema>['body'];
