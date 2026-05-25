import { Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.js';
import { createRoom } from '../../services/rooms.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

import { CreateRoomInput } from './rooms.schema.js';

export async function createRoomHandler(
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

    const input = req.body as CreateRoomInput;
    const room = await createRoom(userId, accessToken, input);

    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
}
