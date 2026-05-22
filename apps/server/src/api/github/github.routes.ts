import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import { listRepos, getPR } from './github.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/repos', listRepos);
router.get('/repos/:owner/:repo/pulls/:pullNumber', getPR);

export default router;
