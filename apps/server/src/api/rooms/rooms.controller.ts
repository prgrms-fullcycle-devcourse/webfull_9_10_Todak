import { Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.js';
import {
  createRoom,
  deleteRoom,
  getRooms,
} from '../../services/rooms.service.js';
import { AuthenticatedRequest } from '../../types/index.js';

import { CreateRoomInput } from './rooms.schema.js';

// 룸 생성
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

// 내가 속한 룸 조회
export async function getRoomsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const rooms = await getRooms(userId);
    res.status(200).json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
}

// 룸 삭제
export async function deleteRoomHandler(
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
    await deleteRoom(userId, roomId, accessToken);

    res.status(200).json({ success: true, message: '룸이 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
}
