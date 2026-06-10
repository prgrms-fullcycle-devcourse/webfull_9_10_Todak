import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import {
  getRoomMembers,
  setupRoomMember,
  updateRoomMember,
  updateRoomMemberStatus,
} from '../../../services/room-member.service.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import {
  SetupRoomMemberInput,
  UpdateRoomMemberInput,
  UpdateMemberStatusInput,
} from './members.schema.js';

// 룸 멤버 목록 조회
export async function getRoomMembersHandler(
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
    const result = await getRoomMembers(userId, roomId);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

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

// 룸 멤버 프로필 수정
export async function updateRoomMemberHandler(
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
    const input = req.body as UpdateRoomMemberInput;

    const member = await updateRoomMember(userId, roomId, input);

    // [DEBUG] 핸들러 도달 + DB 저장 완료 확인용
    console.log(
      `🟢 [profile] 핸들러 도달 / roomId=${roomId} / userId=${userId} / nickname=${member.nickname}`,
    );

    // 같은 룸 전역에 프로필 변경 브로드캐스트 (상대 화면 실시간 반영용)
    getIO().to(roomId).emit('room:member-profile-changed', {
      userId,
      nickname: member.nickname,
      character_type: member.character_type,
      roles: member.roles,
      detailed_role: member.detailed_role,
    });

    // [DEBUG] emit 실제 실행 확인용
    console.log(`🔔 [profile] emit 완료 / roomId=${roomId}`);

    res.status(200).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

// 내 상태 변경 + 소켓 브로드캐스트
export async function updateMemberStatusHandler(
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
    const { status } = req.body as UpdateMemberStatusInput;

    await updateRoomMemberStatus(userId, roomId, status);

    getIO().to(roomId).emit('room:member-status-changed', { userId, status });

    res.status(200).json({ success: true, data: { status } });
  } catch (err) {
    next(err);
  }
}
