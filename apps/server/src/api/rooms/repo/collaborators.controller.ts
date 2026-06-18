import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import {
  addCollaborator,
  listCollaborators,
  removeCollaborator,
  listInvitations,
  deleteInvitation,
  CollaboratorPermission,
} from '../../../services/github/github.service.js';
import {
  assertRoomMember,
  assertRoomHost,
} from '../../../services/rooms/room-guards.js';
import { getIO } from '../../../socket/index.js';
import { AuthenticatedRequest } from '../../../types/index.js';

import { AddCollaboratorInput } from './collaborators.schema.js';

async function getLinkedRepo(roomId: string) {
  const repo = await prisma.repo.findFirst({
    where: { roomId },
    select: { fullName: true },
  });
  if (repo === null) {
    throw new AppError('ROOM_REPO_NOT_FOUND');
  }

  return repo;
}

// POST /rooms/:roomId/repo/collaborators
export async function addCollaboratorHandler(
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
    await assertRoomHost(roomId, userId);

    const { username, permission } = req.body as AddCollaboratorInput;
    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');

    const result = await addCollaborator(
      accessToken,
      owner,
      repoName,
      username,
      permission as CollaboratorPermission,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /rooms/:roomId/repo/collaborators
export async function listCollaboratorsHandler(
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
    await assertRoomMember(roomId, userId);

    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');

    const [collaborators, ownerUser] = await Promise.all([
      listCollaborators(accessToken, owner, repoName),
      prisma.user.findFirst({
        where: { githubUsername: owner },
        select: { avatarUrl: true },
      }),
    ]);

    // GitHub listCollaborators 는 오너를 포함하지 않으므로 직접 추가
    const alreadyIncluded = collaborators.some(c => c.login === owner);
    if (!alreadyIncluded) {
      collaborators.unshift({
        login: owner,
        avatarUrl: ownerUser?.avatarUrl ?? '',
        permission: 'admin',
      });
    }

    res.status(200).json({ success: true, data: collaborators });
  } catch (err) {
    next(err);
  }
}

// DELETE /rooms/:roomId/repo/collaborators/:username
export async function removeCollaboratorHandler(
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

    const { roomId, username } = req.params as {
      roomId: string;
      username: string;
    };
    await assertRoomHost(roomId, userId);

    // githubUsername 으로 룸 멤버 조회
    const target = await prisma.user.findFirst({
      where: { githubUsername: username },
      select: { id: true },
    });

    if (target === null) {
      throw new AppError('USER_NOT_FOUND');
    }

    // 룸 멤버에서 제거 (방장은 본인이므로 제외)
    await prisma.roomMember.deleteMany({
      where: { roomId, userId: target.id },
    });

    // 추방된 유저 본인에게만 kick 이벤트 전송 (개인방 = userId)
    getIO().to(target.id).emit('room:kicked', { roomId });

    // 나머지 멤버에게 퇴장 브로드캐스트
    getIO().to(roomId).emit('room:user-left', { userId: target.id });

    // GitHub 협업자 제거 (non-fatal — DB/소켓 처리 후 시도)
    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');
    try {
      await removeCollaborator(accessToken, owner, repoName, username);
    } catch (err) {
      logger.error({ err }, '[removeCollaborator] GitHub 협업자 제거 실패');
    }

    res
      .status(200)
      .json({ success: true, message: '협업자가 제거되었습니다.' });
  } catch (err) {
    next(err);
  }
}

// GET /rooms/:roomId/repo/collaborators/invitations
export async function listInvitationsHandler(
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
    await assertRoomMember(roomId, userId);

    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');

    const invitations = await listInvitations(accessToken, owner, repoName);
    res.status(200).json({ success: true, data: invitations });
  } catch (err) {
    next(err);
  }
}

// DELETE /rooms/:roomId/repo/collaborators/invitations/:invitationId
export async function deleteInvitationHandler(
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

    const { roomId, invitationId } = req.params as {
      roomId: string;
      invitationId: string;
    };
    await assertRoomHost(roomId, userId);

    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');

    await deleteInvitation(accessToken, owner, repoName, Number(invitationId));
    res.status(200).json({ success: true, message: '초대가 취소되었습니다.' });
  } catch (err) {
    next(err);
  }
}
