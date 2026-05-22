import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import { githubCallback, githubLogin, logout } from './auth.controller.js';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.post('/logout', requireAuth, logout);

export default router;
