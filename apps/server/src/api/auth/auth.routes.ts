import { Router } from 'express';

import {
  githubCallback,
  githubLogin,
  logout,
  refresh,
} from './auth.controller.js';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.post('/refresh', refresh);
// Access Token이 만료돼도 로그아웃 가능하도록 requireAuth 미적용 (Refresh Cookie 기준 처리)
router.post('/logout', logout);

export default router;
