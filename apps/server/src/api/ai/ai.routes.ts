import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import { requestCodeReview } from './ai.controller.js';
import { CodeReviewRequestSchema } from './ai.schema.js';

const router = Router();

router.use(requireAuth);

router.post('/review', validate(CodeReviewRequestSchema), requestCodeReview);

export default router;
