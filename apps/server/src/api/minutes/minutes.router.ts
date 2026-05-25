import { requireAuth } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validate.middleware.js';
import { Router } from 'express';

import { MinutesController } from './minutes.controller.js';
import { MinutesSchema } from './minutes.schema.js';

const router = Router({ mergeParams: true });
const controller = new MinutesController();

router.use(requireAuth);

/**
 * 엔드포인트: /rooms/:roomId/minutes
 */
router
  .route('/')
  .get(validate(MinutesSchema.getMinutesListSchema), controller.getMinutesList)
  .post(
    validate(MinutesSchema.createManualMinutes),
    controller.createManualMinutes,
  );

/**
 * 엔드포인트: /rooms/:roomId/minutes/generate
 */
router.post(
  '/generate',
  validate(MinutesSchema.generateAiMinutes),
  controller.generateAiMinutes,
);

/**
 * 엔드포인트: /rooms/:roomId/minutes/:minutesId
 */
router
  .route('/:minutesId')
  .get(
    validate(MinutesSchema.getMinutesDetailSchema),
    controller.getMinutesDetail,
  )
  .patch(validate(MinutesSchema.updateMinutes), controller.updateMinutes);

/**
 * 엔드포인트: /rooms/:roomId/minutes/:minutesId/ai-refine
 */
router.post(
  '/:minutesId/ai-refine',
  validate(MinutesSchema.refineMinutes),
  controller.refineMinutesWithAI,
);

export const minutesRouter = router;
