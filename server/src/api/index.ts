import { Router, Request, Response } from 'express';

import { generateOpenApiDocument } from '../schema/openapi';

import aiRoutes from './ai/ai.routes';
import authRoutes from './auth/auth.routes';
import githubRoutes from './github/github.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.get('/docs/openapi.json', (_req: Request, res: Response) => {
  res.json(generateOpenApiDocument());
});

router.use('/auth', authRoutes);
router.use('/github', githubRoutes);
router.use('/ai', aiRoutes);

export default router;
