import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  getPullRequestDetail,
  getPullRequests,
  mergePullRequest,
} from '../../../services/prs.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import {
  GetPullRequestDetailParams,
  GetPullRequestsQuery,
  MergePullRequestBody,
} from './prs.schema.js';

export async function getPullRequestsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId } = req.params as { roomId: string };
    const query = req.query as unknown as GetPullRequestsQuery;

    const { pull_requests, pagination } = await getPullRequests(
      userId,
      roomId,
      query,
    );

    res
      .status(200)
      .json({ success: true, data: { pull_requests, pagination } });
  } catch (err) {
    next(err);
  }
}

export async function getPullRequestDetailHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId, pullNumber } =
      req.params as unknown as GetPullRequestDetailParams;

    const pullRequest = await getPullRequestDetail(userId, roomId, pullNumber);

    res.status(200).json({ success: true, data: pullRequest });
  } catch (err) {
    next(err);
  }
}

export async function mergePullRequestHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const { roomId, pullNumber } =
      req.params as unknown as GetPullRequestDetailParams;
    const body = req.body as MergePullRequestBody;

    const result = await mergePullRequest(userId, roomId, pullNumber, body);

    res.status(200).json({
      success: true,
      message: 'PR이 성공적으로 머지되었습니다.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
