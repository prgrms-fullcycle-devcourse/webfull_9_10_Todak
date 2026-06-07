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
  status: z.enum(['draft', 'confirmed', 'generating', 'failed']).optional(),
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

const ActionItemSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().optional(),
  labels: z.array(z.string()).default([]),
});

const UpdateMinutesBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    type: z.enum(['meeting', 'troubleshooting', 'etc']).optional(),
    content_md: z.string().optional(),
    action_items: z.array(ActionItemSchema).optional(),
    status: z.enum(['draft', 'confirmed']).optional(),
  })
  .refine(data => Object.keys(data).length > 0);

/*
 * AI 다듬기 요청. 프리셋(SHORTEN/BULLET)은 지시문을 서버가 소유하고,
 * CUSTOM 일 때만 custom_message 로 사용자 지시문을 받는다.
 */
const RefineMinutesBodySchema = z
  .object({
    refine_type: z.enum(['SHORTEN', 'BULLET', 'CUSTOM']),
    custom_message: z.string().trim().min(1).optional(),
  })
  .refine(
    data => data.refine_type !== 'CUSTOM' || data.custom_message !== undefined,
    { message: 'refine_type이 CUSTOM이면 custom_message가 필요합니다.' },
  );

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
