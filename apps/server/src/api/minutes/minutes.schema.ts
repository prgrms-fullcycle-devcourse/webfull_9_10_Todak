import { z } from 'zod';

const CommonParamsSchema = z.object({
  roomId: z.uuid(),
});

const DetailParamsSchema = z.object({
  roomId: z.uuid(),
  minutesId: z.uuid(),
});

const GetMinutesListQuerySchema = z.object({
  type: z.enum(['meeting', 'troubleshooting', 'etc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(5),
});

const CreateManualMinutesBodySchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(['meeting', 'troubleshooting', 'etc']),
  content_md: z.string().default(''),
});

const GenerateAiMinutesBodySchema = z.object({
  meeting_id: z.uuid(),
  title: z.string().min(1).optional(),
});

const UpdateMinutesBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    type: z.enum(['meeting', 'troubleshooting', 'etc']).optional(),
    content_md: z.string().optional(),
    action_items: z.array(z.string()).optional(),
    status: z.enum(['draft', 'confirmed']).optional(),
  })
  .refine(data => Object.keys(data).length > 0);

const RefineMinutesBodySchema = z.object({
  prompt: z.string().trim().min(1),
});

export const MinutesSchema = {
  commonParams: CommonParamsSchema,
  detailParams: DetailParamsSchema,
  getMinutesListQuery: GetMinutesListQuerySchema,
  createManualMinutesBody: CreateManualMinutesBodySchema,
  generateAiMinutesBody: GenerateAiMinutesBodySchema,
  updateMinutesBody: UpdateMinutesBodySchema,
  refineMinutesBody: RefineMinutesBodySchema,
};

export type GetMinutesListParams = z.infer<typeof CommonParamsSchema>;
export type GetMinutesListQuery = z.infer<typeof GetMinutesListQuerySchema>;
export type CreateManualMinutesParams = z.infer<typeof CommonParamsSchema>;
export type CreateManualMinutesBody = z.infer<
  typeof CreateManualMinutesBodySchema
>;
export type GenerateAiMinutesParams = z.infer<typeof CommonParamsSchema>;
export type GenerateAiMinutesBody = z.infer<typeof GenerateAiMinutesBodySchema>;
export type GetMinutesDetailParams = z.infer<typeof DetailParamsSchema>;
export type UpdateMinutesParams = z.infer<typeof DetailParamsSchema>;
export type UpdateMinutesBody = z.infer<typeof UpdateMinutesBodySchema>;
export type RefineMinutesParams = z.infer<typeof DetailParamsSchema>;
export type RefineMinutesBody = z.infer<typeof RefineMinutesBodySchema>;
