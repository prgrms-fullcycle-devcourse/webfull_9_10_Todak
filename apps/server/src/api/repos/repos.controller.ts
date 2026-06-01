import { Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.js';
import {
  createGithubRepo,
  deleteGithubRepo,
} from '../../services/repos.service.js';
import { getIO } from '../../socket/index.js';
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

export async function deleteRepoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { repoId } = req.params as { repoId: string };

    const { roomId } = await deleteGithubRepo(userId, repoId);

    getIO().to(roomId).emit('repo:deleted', { roomId, repoId });

    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
