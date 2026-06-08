import { Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.js';
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  joinRoom,
  leaveRoom,
  updateRoom,
} from '../../services/rooms.service.js';
import { getIO } from '../../socket/index.js';
import { AuthenticatedRequest } from '../../types/index.js';

import {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from './rooms.schema.js';

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

// 특정 룸 상세 조회
export async function getRoomByIdHandler(
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
    const room = await getRoomById(userId, roomId);

    res.status(200).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
}

// 초대 코드로 룸 입장
export async function joinRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { user } = req;
    if (user === undefined) {
      throw new AppError('UNAUTHORIZED');
    }

    const input = req.body as JoinRoomInput;
    const result = await joinRoom(user.id, input);

    getIO().to(result.room_id).emit('room:member-joined', {
      roomId: result.room_id,
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 룸 정보 수정
export async function updateRoomHandler(
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
    const input = req.body as UpdateRoomInput;
    const room = await updateRoom(userId, roomId, input);

    getIO().to(roomId).emit('room:updated', room);

    res.status(200).json({ success: true, data: room });
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

// 룸 탈퇴
export async function leaveRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (userId === undefined) {
      throw new AppError('UNAUTHORIZED');
    }
    // 마지막 멤버 탈퇴 시 webhook 해제에 필요. 없으면 빈 문자열로 위임(해제 실패는 무시됨)
    const accessToken = req.user?.githubAccessToken ?? '';

    const { roomId } = req.params as { roomId: string };
    const result = await leaveRoom(userId, roomId, accessToken);

    // 룸이 남아 있는 경우에만 잔류 멤버에게 브로드캐스트(방장 위임 포함)
    if (!result.room_deleted) {
      getIO().to(roomId).emit('room:member-left', {
        roomId,
        userId,
        newHostUserId: result.new_host_user_id,
      });
    }

    res.status(200).json({
      success: true,
      message: result.room_deleted
        ? '룸에서 나갔습니다. 마지막 멤버였기 때문에 룸이 삭제되었습니다.'
        : '룸에서 나갔습니다.',
      data: {
        room_deleted: result.room_deleted,
        new_host_user_id: result.new_host_user_id,
      },
    });
  } catch (err) {
    next(err);
  }
}
