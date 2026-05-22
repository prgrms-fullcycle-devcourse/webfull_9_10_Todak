import { Request, Response, NextFunction } from 'express';

import { addJob } from '../../jobs/queues/index.js';

export async function requestCodeReview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code, context } = req.body as { code: string; context?: string };
    const job = await addJob('ai-review', { code, context });
    res.status(202).json({
      success: true,
      data: { jobId: job.id, message: 'Code review queued' },
    });
  } catch (err) {
    next(err);
  }
}
