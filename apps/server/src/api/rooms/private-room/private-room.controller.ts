import { Response, NextFunction } from 'express';

import { getUserId } from '../../../middleware/auth.middleware.js';
import { getPrivateRoomChats } from '../../../services/chat.service.js';
import {
  getPrivateRoomsForUser,
  enterPrivateRoom,
  leavePrivateRoom,
} from '../../../services/private-room.service.js';
import { broadcastPrivateRooms } from '../../../socket/broadcast.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';
import { slim } from '../chat/chat.controller.js';
import { ChatsQuery } from '../chat/chat.schema.js';

export async function getPrivateRoomsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roomId } = req.params as { roomId: string };
    const userId = getUserId(req);

    const privateRooms = await getPrivateRoomsForUser(roomId, userId);

    res.json(privateRooms);
  } catch (err) {
    next(err);
  }
}

export async function enterPrivateRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roomId, privateRoomId } = req.params as {
      roomId: string;
      privateRoomId: string;
    };
    const userId = getUserId(req);

    const result = await enterPrivateRoom(roomId, privateRoomId, userId);

    // 같은 룸의 모든 멤버에게 최신 프라이빗룸 상태 broadcast
    await broadcastPrivateRooms(getIO(), roomId);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function leavePrivateRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roomId, privateRoomId } = req.params as {
      roomId: string;
      privateRoomId: string;
    };
    const userId = getUserId(req);

    const result = await leavePrivateRoom(roomId, privateRoomId, userId);

    // 같은 룸의 모든 멤버에게 최신 프라이빗룸 상태 broadcast
    await broadcastPrivateRooms(getIO(), roomId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPrivateRoomChatsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);

    const { roomId, privateRoomId } = req.params as {
      roomId: string;
      privateRoomId: string;
    };
    const { before, limit } = req.query as unknown as ChatsQuery;

    const chats = await getPrivateRoomChats(userId, roomId, privateRoomId, {
      before,
      limit,
    });

    res.json(chats.map(slim));
  } catch (err) {
    next(err);
  }
}
