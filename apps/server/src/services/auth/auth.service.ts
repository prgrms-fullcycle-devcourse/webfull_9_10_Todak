import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1시간
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일

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
  githubAccessToken: string;
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

// Access Token (1시간) — type: 'access' 클레임으로 Refresh Token과 구분
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

// Refresh Token (7일) — userId만 담고 type: 'refresh' 클레임 부여
export function signRefreshToken(userId: string): string {
  return jwt.sign({ id: userId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });
}

// Access Token 검증 — 만료는 TOKEN_EXPIRED(401), 그 외 위조/타입 불일치는 INVALID_TOKEN
export function verifyJwt(token: string): JwtPayload {
  let decoded: JwtPayload & { type?: string };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
      type?: string;
    };
  } catch (err) {
    // 만료된 토큰 → 프론트가 /auth/refresh 호출하도록 401 TOKEN_EXPIRED로 구분
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED');
    }
    throw new AppError('INVALID_TOKEN');
  }

  if (decoded.type !== 'access') {
    throw new AppError('INVALID_TOKEN');
  }

  return decoded;
}

// Refresh Token 검증 — 만료는 TOKEN_EXPIRED(401), 그 외 위조/타입 불일치는 INVALID_TOKEN
export function verifyRefreshToken(token: string): { id: string } {
  let decoded: { id: string; type?: string };
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      type?: string;
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED');
    }
    throw new AppError('INVALID_TOKEN');
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('INVALID_TOKEN');
  }

  return decoded;
}

// Redis — Refresh Token 저장/조회/삭제
export async function saveRefreshToken(
  userId: string,
  token: string,
): Promise<void> {
  await redis.set(`refresh:${userId}`, token, 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

export async function getRefreshToken(userId: string): Promise<string | null> {
  return redis.get(`refresh:${userId}`);
}

export async function deleteRefreshToken(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}
