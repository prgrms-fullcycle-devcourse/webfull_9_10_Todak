import { Request, Response } from 'express';

import { env } from '../../config/env.js';
import { AuthenticatedRequest } from '../../types/index.js';

export async function githubLogin(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

export async function githubCallback(req: Request, res: Response) {
  const { code } = req.query as { code: string };

  // TODO: code를 access_token으로 교환 후 JWT 발급
  res.json({ success: true, message: 'GitHub OAuth callback', code });
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  res.json({ success: true, data: req.user ?? null });
}
