import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

import { requestCodeReview } from './ai.controller';
import { CodeReviewRequestSchema } from './ai.schema';

const router = Router();

router.use(requireAuth);

router.post('/review', validate(CodeReviewRequestSchema), requestCodeReview);

export default router;
