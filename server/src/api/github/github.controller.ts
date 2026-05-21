import { Response, NextFunction } from 'express';

import { getUserRepos, getPullRequest } from '../../services/github.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

export async function listRepos(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const accessToken = req.user?.githubAccessToken ?? '';
    const repos = await getUserRepos(accessToken);
    res.json({ success: true, data: repos });
  } catch (err) {
    next(err);
  }
}

export async function getPR(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { owner, repo, pullNumber } = req.params as {
      owner: string;
      repo: string;
      pullNumber: string;
    };
    const accessToken = req.user?.githubAccessToken ?? '';
    const pr = await getPullRequest(
      accessToken,
      owner,
      repo,
      Number(pullNumber),
    );
    res.json({ success: true, data: pr });
  } catch (err) {
    next(err);
  }
}
