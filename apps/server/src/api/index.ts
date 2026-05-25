import { Request, Response, Router } from 'express';

import { generateOpenApiDocument } from '../schema/openapi.js';

import aiRoutes from './ai/ai.routes.js';
import authRoutes from './auth/auth.routes.js';
import githubRoutes from './github/github.routes.js';
import reposRoutes from './repos/repos.routes.js';
import roomsRoutes from './rooms/rooms.routes.js';
import { minutesRouter } from './minutes/minutes.router.js';
import usersRoutes from './users/users.routes.js';

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
router.use('/users', usersRoutes);
router.use('/github', githubRoutes);
router.use('/repos', reposRoutes);
router.use('/rooms', roomsRoutes);
router.use('/ai', aiRoutes);
router.use('/rooms/:roomId/minutes', minutesRouter);

export default router;
