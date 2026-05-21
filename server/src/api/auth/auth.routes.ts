import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import { githubLogin, githubCallback, getMe } from './auth.controller.js';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/me', requireAuth, getMe);

export default router;
