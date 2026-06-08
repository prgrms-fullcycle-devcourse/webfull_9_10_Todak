import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  createPullRequestReview,
  getPullRequestDetail,
  getPullRequests,
  mergePullRequest,
} from '../../../services/prs.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import {
  CreatePullRequestReviewBody,
  GetPullRequestDetailParams,
  GetPullRequestsQuery,
  MergePullRequestBody,
} from './prs.schema.js';

const REVIEW_MESSAGE: Record<string, string> = {
  APPROVE: 'PR을 승인했습니다.',
  REQUEST_CHANGES: 'PR에 변경을 요청했습니다.',
  COMMENT: 'PR에 리뷰 코멘트를 등록했습니다.',
};

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

export async function createPullRequestReviewHandler(
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
    const body = req.body as CreatePullRequestReviewBody;

    const result = await createPullRequestReview(
      userId,
      roomId,
      pullNumber,
      body,
    );

    res.status(200).json({
      success: true,
      message: REVIEW_MESSAGE[body.event] ?? '리뷰를 등록했습니다.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
