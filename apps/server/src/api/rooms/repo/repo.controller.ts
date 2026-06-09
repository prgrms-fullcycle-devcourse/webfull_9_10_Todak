import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { disconnectRepo } from '../../../services/repos.service.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

// 레포 연결 해제 (룸 유지) — 방장만 가능
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
