import { Router } from 'express';

import { githubWebhookHandler } from './github.webhook.controller.js';

/*
 * GitHub Webhook 라우터.
 * app.ts 에서 express.json 보다 먼저 express.raw 와 함께 마운트된다.
 */
const router = Router();

router.post('/', githubWebhookHandler);

export default router;
