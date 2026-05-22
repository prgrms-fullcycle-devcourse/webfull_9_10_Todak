import { Response, NextFunction } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyJwt } from '../services/auth.service.js';
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
