import { Request, Response, NextFunction } from 'express';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { prisma } from '../../lib/prisma.js';
import {
  deleteRefreshToken,
  exchangeCodeForToken,
  getGithubUser,
  getRefreshToken,
  JwtPayload,
  REFRESH_TOKEN_TTL_SECONDS,
  saveRefreshToken,
  signAccessToken,
  signRefreshToken,
  upsertUser,
  verifyRefreshToken,
} from '../../services/auth/auth.service.js';

const isProd = env.NODE_ENV === 'production';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  // 프로덕션은 클라이언트/서버 도메인이 다르므로 크로스 사이트 쿠키 전송을 위해 none + secure 필요
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000, // 초 → ms
  path: '/',
};

export async function githubLogin(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // async rejection 을 Express 4 는 에러 미들웨어로 안 넘기므로(→ 프로세스 종료) 직접 next(err) 위임
  try {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'user repo delete_repo',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (err) {
    next(err);
  }
}

export async function githubCallback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // code 누락·외부 GitHub API 실패가 unhandledRejection 으로 새어 서버가 죽지 않도록 try/catch
  try {
    const { code } = req.query as { code?: string };

    if (code === undefined || code === '') {
      throw new AppError('BAD_REQUEST');
    }

    const githubToken = await exchangeCodeForToken(code);
    const githubUser = await getGithubUser(githubToken);
    const user = await upsertUser(githubUser, githubToken);

    const payload: JwtPayload = {
      id: user.id,
      githubId: Number(user.githubId),
      login: user.githubUsername,
      avatarUrl: user.avatarUrl ?? '',
      githubAccessToken: githubToken,
    };

    // Access Token (1시간) → URL 쿼리로 전달
    const accessToken = signAccessToken(payload);

    // Refresh Token (7일) → HttpOnly Cookie로 전달 + Redis 저장
    const refreshToken = signRefreshToken(user.id);
    await saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    const clientUrl = env.CLIENT_URL.split(',')[0].trim();
    res.redirect(`${clientUrl}/auth/callback?token=${accessToken}`);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    if (refreshToken === undefined || refreshToken === '') {
      throw new AppError('UNAUTHORIZED');
    }

    // JWT 검증
    const { id: userId } = verifyRefreshToken(refreshToken);

    // Redis에 저장된 토큰과 비교
    const stored = await getRefreshToken(userId);
    if (stored === null || stored !== refreshToken) {
      throw new AppError('INVALID_TOKEN');
    }

    // 유저 정보 조회
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw new AppError('UNAUTHORIZED');
    }

    const payload: JwtPayload = {
      id: user.id,
      githubId: Number(user.githubId),
      login: user.githubUsername,
      avatarUrl: user.avatarUrl ?? '',
      githubAccessToken: user.accessToken ?? '',
    };

    const newAccessToken = signAccessToken(payload);

    // Refresh Token Rotation — 재발급 때마다 Refresh Token도 새로 발급해 기존 토큰 무효화
    const newRefreshToken = signRefreshToken(user.id);
    await saveRefreshToken(user.id, newRefreshToken);
    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res
      .status(200)
      .json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // Access Token이 만료됐어도 로그아웃은 되도록 Refresh Cookie 기준으로 처리
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    if (refreshToken !== undefined && refreshToken !== '') {
      try {
        const { id } = verifyRefreshToken(refreshToken);
        await deleteRefreshToken(id);
      } catch {
        // 토큰이 만료/위조됐어도 쿠키는 정리하고 진행
      }
    }

    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  } catch (err) {
    next(err);
  }
}
