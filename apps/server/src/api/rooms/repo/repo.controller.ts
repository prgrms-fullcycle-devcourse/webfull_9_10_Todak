import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  connectRepo,
  disconnectRepo,
} from '../../../services/repos.service.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { ConnectRepoInput } from './repo.schema.js';

// 레포 연결/교체
export async function connectRepoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const accessToken = req.user?.githubAccessToken;
    if (
      userId === undefined ||
      accessToken === undefined ||
      accessToken === ''
    ) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId } = req.params as { roomId: string };
    const { repo_full_name } = req.body as ConnectRepoInput;
    const result = await connectRepo(
      userId,
      roomId,
      accessToken,
      repo_full_name,
    );

    getIO().to(roomId).emit('repo:connected', {
      roomId,
      repoId: result.repo_id,
      repo_full_name: result.repo_full_name,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 레포 연결 해제
export async function disconnectRepoHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const accessToken = req.user?.githubAccessToken;
    if (
      userId === undefined ||
      accessToken === undefined ||
      accessToken === ''
    ) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId } = req.params as { roomId: string };
    const { repoId } = await disconnectRepo(userId, roomId, accessToken);

    getIO().to(roomId).emit('repo:deleted', { roomId, repoId });

    res
      .status(200)
      .json({ success: true, message: '레포 연결이 해제되었습니다.' });
  } catch (err) {
    next(err);
  }
}
