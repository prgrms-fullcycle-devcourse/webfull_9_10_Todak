import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface JwtPayload {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });

  if (!res.ok) {
    throw new AppError('GITHUB_API_ERROR');
  }

  const data = (await res.json()) as GithubTokenResponse;
  if (data.access_token === undefined || data.access_token === '') {
    throw new AppError('GITHUB_API_ERROR');
  }

  return data.access_token;
}

export async function getGithubUser(accessToken: string): Promise<GithubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new AppError('GITHUB_API_ERROR');
  }

  return res.json() as Promise<GithubUser>;
}

export async function upsertUser(githubUser: GithubUser, accessToken: string) {
  return prisma.user.upsert({
    where: { githubId: String(githubUser.id) },
    update: {
      githubUsername: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      accessToken,
    },
    create: {
      githubId: String(githubUser.id),
      githubUsername: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      accessToken,
    },
  });
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError('INVALID_TOKEN');
  }
}
