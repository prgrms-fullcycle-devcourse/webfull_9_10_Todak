import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  ChatPayload,
  getMainRoomChats,
} from '../../../services/chat.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { ChatsQuery } from './chat.schema.js';

// url 컨텍스트로 알 수 있는 room_id / private_room_id 는 응답에서 제외
function slim(chat: ChatPayload) {
  return {
    id: chat.id,
    user: chat.user,
    content: chat.content,
    type: chat.type,
    created_at: chat.created_at,
  };
}

export async function getMainRoomChatsHandler(
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
    const { before, limit } = req.query as unknown as ChatsQuery;

    const chats = await getMainRoomChats(userId, roomId, { before, limit });

    res.json(chats.map(slim));
  } catch (err) {
    next(err);
  }
}
