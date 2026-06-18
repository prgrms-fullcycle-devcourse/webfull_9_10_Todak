import { Response, NextFunction } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyJwt } from '../services/auth/auth.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === undefined || token === '') {
    throw new AppError('UNAUTHORIZED');
  }

  req.user = verifyJwt(token);
  next();
}

/*
 * 인증된 요청에서 userId 를 꺼낸다.
 * requireAuth 통과 후에도 req.user 는 타입상 optional 이라, 컨트롤러마다
 * 반복하던 "없으면 UNAUTHORIZED" 검사를 한곳으로 모은다.
 */
export function getUserId(req: AuthenticatedRequest): string {
  if (req.user?.id === undefined) {
    throw new AppError('UNAUTHORIZED');
  }

  return req.user.id;
}
