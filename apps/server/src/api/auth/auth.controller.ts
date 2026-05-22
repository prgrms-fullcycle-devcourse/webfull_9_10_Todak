import { Request, Response } from 'express';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import {
  exchangeCodeForToken,
  getGithubUser,
  signJwt,
  upsertUser,
} from '../../services/auth.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

export async function githubLogin(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'user repo',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

export async function githubCallback(req: Request, res: Response) {
  const { code } = req.query as { code?: string };

  if (code === undefined || code === '') {
    throw new AppError('BAD_REQUEST');
  }

  const accessToken = await exchangeCodeForToken(code);
  const githubUser = await getGithubUser(accessToken);
  const user = await upsertUser(githubUser, accessToken);

  const token = signJwt({
    id: user.id,
    githubId: Number(user.githubId),
    login: user.githubUsername,
    avatarUrl: user.avatarUrl ?? '',
  });

  res.redirect(`${env.CLIENT_URL}/auth/callback?token=${token}`);
}

export async function logout(_req: Request, res: Response) {
  res.json({ success: true, message: '로그아웃 되었습니다.' });
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  res.json({ success: true, data: req.user ?? null });
}
