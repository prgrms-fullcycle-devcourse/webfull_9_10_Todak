import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { setupRoomMember } from '../../../services/room-member.service.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { SetupRoomMemberInput } from './members.schema.js';

// 룸 멤버 최초 setup (캐릭터/닉네임/역할/세부 직군)
export async function setupRoomMemberHandler(
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
    const input = req.body as SetupRoomMemberInput;

    const member = await setupRoomMember(userId, roomId, input);

    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}
