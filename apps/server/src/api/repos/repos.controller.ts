import { Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.js';
import { createGithubRepo } from '../../services/repos.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

import { CreateRepoInput } from './repos.schema.js';

export async function createRepo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const accessToken = req.user?.githubAccessToken;
    if (accessToken === undefined || accessToken === '') {
      throw new AppError('UNAUTHORIZED');
    }

    const input = req.body as CreateRepoInput;
    const repo = await createGithubRepo(accessToken, input);

    res.status(201).json({ success: true, data: repo });
  } catch (err) {
    next(err);
  }
}
