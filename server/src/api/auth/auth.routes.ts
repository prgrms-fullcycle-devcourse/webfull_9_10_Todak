import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware';

import { githubLogin, githubCallback, getMe } from './auth.controller';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/me', requireAuth, getMe);

export default router;
