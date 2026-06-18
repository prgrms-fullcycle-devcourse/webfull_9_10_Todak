import { CreateRepoInput } from '../../api/repos/repos.schema.js';
import { AppError } from '../../errors/AppError.js';
import { isUniqueConstraintError } from '../../errors/prisma.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import {
  createRepo,
  deleteRepo,
  registerWebhook,
  unregisterWebhook,
} from '../github/github.service.js';
import { assertRoomHost } from '../rooms/room-guards.js';

export async function createGithubRepo(
  accessToken: string,
  input: CreateRepoInput,
) {
  return createRepo(
    accessToken,
    input.name,
    input.private,
    input.org,
    input.auto_init,
  );
}

// GitHub 웹훅 해제 → Repo 레코드 삭제
export async function disconnectRepo(
  userId: string,
  roomId: string,
  accessToken: string,
) {
  await assertRoomHost(roomId, userId);

  const repo = await prisma.repo.findFirst({
    where: { roomId },
    select: { id: true, webhookId: true, fullName: true },
  });
  if (repo === null) {
    throw new AppError('ROOM_REPO_NOT_FOUND');
  }

  if (repo.webhookId !== null) {
    const [owner, repoName] = repo.fullName.split('/');
    try {
      await unregisterWebhook(accessToken, owner, repoName, repo.webhookId);
    } catch {
      // 웹훅 해제 실패해도(권한 없음·이미 삭제됨 등) 연결 해제는 계속 진행
      logger.error(`[disconnectRepo] webhook 해제 실패: ${repo.fullName}`);
    }
  }

  await prisma.repo.delete({ where: { id: repo.id } });

  return { repoId: repo.id };
}

// 연결된 레포가 없으면 신규 연결, 있으면 교체(재연결)
export async function connectRepo(
  userId: string,
  roomId: string,
  accessToken: string,
  repoFullName: string,
) {
  await assertRoomHost(roomId, userId);

  // 다른 룸이 이미 같은 레포를 쓰고 있으면 연결 불가
  const usedByOther = await prisma.repo.findFirst({
    where: { fullName: repoFullName, NOT: { roomId } },
    select: { id: true },
  });
  if (usedByOther !== null) {
    throw new AppError('REPO_ALREADY_IN_USE');
  }

  const existing = await prisma.repo.findFirst({
    where: { roomId },
    select: { id: true, fullName: true, webhookId: true },
  });

  // 새 레포에 웹훅 등록 (admin 권한·레포 존재 검증 겸함), 실패하면 DB 는 그대로
  const [owner, repo] = repoFullName.split('/');
  const webhookId = await registerWebhook(accessToken, owner, repo);

  // 같은 레포 재연결(웹훅 복구 등) — repoId 유지해 기존 Todo 연결 보존
  if (existing !== null && existing.fullName === repoFullName) {
    const saved = await prisma.repo.update({
      where: { id: existing.id },
      data: { webhookId },
    });

    return {
      repo_id: saved.id,
      room_id: roomId,
      repo_full_name: saved.fullName,
      webhook_registered: true,
    };
  }

  /*
   * 신규 연결 또는 다른 레포로 교체 — Repo 레코드를 새로 만들어 repoId 회전
   * (교체 시 기존 레코드 삭제로 옛 Todo 의 repoId 가 SetNull 처리되어 보존된다)
   */
  let saved;
  try {
    saved = await prisma.$transaction(async tx => {
      if (existing !== null) {
        await tx.repo.delete({ where: { id: existing.id } });
      }

      return tx.repo.create({
        data: { roomId, fullName: repoFullName, webhookId },
      });
    });
  } catch (error) {
    /*
     * usedByOther 체크 통과 후 다른 룸이 먼저 같은 레포를 연결한 race.
     * repo.full_name UNIQUE 위반(P2002)을 409 로 변환한다.
     * 방금 등록한 webhook 은 주인 없는 중복이 되므로 정리한다(best-effort).
     */
    if (isUniqueConstraintError(error)) {
      try {
        await unregisterWebhook(accessToken, owner, repo, webhookId);
      } catch {
        logger.error(`[connectRepo] 중복 webhook 해제 실패: ${repoFullName}`);
      }
      throw new AppError('REPO_ALREADY_IN_USE');
    }
    throw error;
  }

  // 교체된 경우 이전 웹훅 해제 (best-effort, 트랜잭션 밖)
  if (existing !== null && existing.webhookId !== null) {
    const [oldOwner, oldRepo] = existing.fullName.split('/');
    try {
      await unregisterWebhook(
        accessToken,
        oldOwner,
        oldRepo,
        existing.webhookId,
      );
    } catch {
      // 이전 웹훅 해제 실패해도(권한 없음·이미 삭제됨 등) 연결 교체는 계속 진행
      logger.error(
        `[connectRepo] 이전 webhook 해제 실패: ${existing.fullName}`,
      );
    }
  }

  return {
    repo_id: saved.id,
    room_id: roomId,
    repo_full_name: saved.fullName,
    webhook_registered: true,
  };
}

export async function deleteGithubRepo(userId: string, repoId: string) {
  // 1. 레포 조회
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { roomId: true, fullName: true },
  });
  if (repo === null) {
    throw new AppError('REPO_NOT_FOUND');
  }

  // 2. 해당 룸의 멤버인지 검증
  const membership = await prisma.roomMember.findFirst({
    where: { roomId: repo.roomId, userId },
    select: { isHost: true },
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 3. 레포는 룸당 1개이며 삭제 시 룸 전체에 영향을 주는 민감 작업 → 방장만 가능
  if (!membership.isHost) {
    throw new AppError('FORBIDDEN');
  }

  // 4. 유저의 GitHub 액세스 토큰 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  if (user?.accessToken === null || user?.accessToken === undefined) {
    throw new AppError('GITHUB_SCOPE_REQUIRED');
  }

  // 5. GitHub 레포지토리 삭제
  const [owner, repoName] = repo.fullName.split('/');
  await deleteRepo(user.accessToken, owner, repoName);

  // 6. DB에서 레포 삭제
  await prisma.repo.delete({ where: { id: repoId } });

  return { roomId: repo.roomId };
}
