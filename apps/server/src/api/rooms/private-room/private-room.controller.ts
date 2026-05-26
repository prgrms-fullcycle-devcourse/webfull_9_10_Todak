import { Response, NextFunction } from 'express';

import { getPrivateRooms } from '../../../services/private-room.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

export async function getPrivateRoomsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roomId } = req.params as { roomId: string };

    const privateRooms = await getPrivateRooms(roomId);

    res.json(privateRooms);
  } catch (err) {
    next(err);
  }
}
