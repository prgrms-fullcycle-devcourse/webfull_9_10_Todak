import { Response, NextFunction } from 'express';

import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../lib/prisma.js';
import {
  addCollaborator,
  listCollaborators,
  removeCollaborator,
  listInvitations,
  deleteInvitation,
  CollaboratorPermission,
} from '../../../services/github.service.js';
import {
  assertRoomMember,
  assertRoomHost,
} from '../../../services/room-guards.js';
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

    const collaborators = await listCollaborators(accessToken, owner, repoName);
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

    const repo = await getLinkedRepo(roomId);
    const [owner, repoName] = repo.fullName.split('/');

    await removeCollaborator(accessToken, owner, repoName, username);
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
