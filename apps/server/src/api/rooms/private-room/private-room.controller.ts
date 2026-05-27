import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { getPrivateRoomChats } from '../../../services/chat.service.js';
import {
  getPrivateRooms,
  enterPrivateRoom,
  leavePrivateRoom,
} from '../../../services/private-room.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';
import { ChatsQuery } from '../chat/chat.schema.js';

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
    const userId = req.user?.id;

    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const result = await enterPrivateRoom(roomId, privateRoomId, userId);

    // Socket 이벤트 트리거: 같은 룸의 모든 멤버에게 업데이트 브로드캐스트
    const io = req.app.get('io');
    if (io !== undefined) {
      const privateRooms = await getPrivateRooms(roomId);
      io.to(roomId).emit('room:private-rooms-updated', privateRooms);
    }

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
    const userId = req.user?.id;

    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const result = await leavePrivateRoom(roomId, privateRoomId, userId);

    // Socket 이벤트 트리거: 같은 룸의 모든 멤버에게 업데이트 브로드캐스트
    const io = req.app.get('io');
    if (io !== undefined) {
      const privateRooms = await getPrivateRooms(roomId);
      io.to(roomId).emit('room:private-rooms-updated', privateRooms);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function slim(chat: {
  id: string;
  user: { github_username: string; avatar_url: string | null };
  content: string | null;
  type: string;
  created_at: string;
}) {
  return {
    id: chat.id,
    user: chat.user,
    content: chat.content,
    type: chat.type,
    created_at: chat.created_at,
  };
}

export async function getPrivateRoomChatsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

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
