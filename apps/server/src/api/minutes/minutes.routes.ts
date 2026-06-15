import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
/*
 * [임시] 팀원 테스트용 AI rate limit 해제 — 테스트 끝나면 아래 import + 사용처 주석 해제해 복구
 * import {
 *   aiGenerateLimiter,
 *   aiRefineLimiter,
 * } from '../../middleware/rateLimit.middleware.js';
 */
import { validate } from '../../middleware/validate.middleware.js';

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
  .get(
    validate(MinutesSchema.commonParams, 'params'),
    validate(MinutesSchema.getMinutesListQuery, 'query'),
    controller.getMinutesList,
  )
  .post(
    validate(MinutesSchema.commonParams, 'params'),
    validate(MinutesSchema.createManualMinutesBody, 'body'),
    controller.createManualMinutes,
  );

/**
 * 엔드포인트: /rooms/:roomId/minutes/generate
 */
router.post(
  '/generate',
  /*
   * [임시] 팀원 테스트용 rate limit 해제 — 복구 시 주석 해제
   * aiGenerateLimiter,
   */
  validate(MinutesSchema.commonParams, 'params'),
  validate(MinutesSchema.generateAiMinutesBody, 'body'),
  controller.generateAiMinutes,
);

/**
 * 엔드포인트: /rooms/:roomId/minutes/:minutesId
 */
router
  .route('/:minutesId')
  .get(
    validate(MinutesSchema.detailParams, 'params'),
    controller.getMinutesDetail,
  )
  .patch(
    validate(MinutesSchema.detailParams, 'params'),
    validate(MinutesSchema.updateMinutesBody, 'body'),
    controller.updateMinutes,
  );

/**
 * 엔드포인트: /rooms/:roomId/minutes/:minutesId/ai-refine
 */
router.post(
  '/:minutesId/ai-refine',
  /*
   * [임시] 팀원 테스트용 rate limit 해제 — 복구 시 주석 해제
   * aiRefineLimiter,
   */
  validate(MinutesSchema.detailParams, 'params'),
  validate(MinutesSchema.refineMinutesBody, 'body'),
  controller.refineMinutesWithAI,
);

export default router;
