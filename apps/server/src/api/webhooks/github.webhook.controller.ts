import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../errors/AppError.js';
import {
  handleGithubEvent,
  verifyGithubSignature,
} from '../../services/webhook.service.js';

/*
 * GitHub Webhook 수신 핸들러.
 * - 인증은 JWT 가 아니라 X-Hub-Signature-256(HMAC) 으로 한다.
 * - raw body(Buffer) 가 필요하므로 이 라우트는 express.raw 로 받는다(app.ts 참고).
 */
export async function githubWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rawBody = req.body as Buffer;
    const signature = req.header('X-Hub-Signature-256');

    if (!verifyGithubSignature(rawBody, signature)) {
      throw new AppError('WEBHOOK_SIGNATURE_INVALID');
    }

    const event = req.header('X-GitHub-Event');
    const payload = JSON.parse(rawBody.toString('utf8')) as unknown;

    await handleGithubEvent(event, payload);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    next(error);
  }
}
