import { CreateRepoInput } from '../api/repos/repos.schema.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

import { createRepo, deleteRepo } from './github.service.js';

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

export async function deleteGithubRepo(userId: string, repoId: string) {
  // 1. 레포 조회
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
  });
  if (repo === null) {
    throw new AppError('REPO_NOT_FOUND');
  }

  // 2. 해당 룸의 멤버인지 검증
  const membership = await prisma.roomMember.findFirst({
    where: { roomId: repo.roomId, userId },
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 3. 유저의 GitHub 액세스 토큰 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  if (user?.accessToken === null || user?.accessToken === undefined) {
    throw new AppError('GITHUB_SCOPE_REQUIRED');
  }

  // 4. GitHub 레포지토리 삭제
  const [owner, repoName] = repo.fullName.split('/');
  await deleteRepo(user.accessToken, owner, repoName);

  // 5. DB에서 레포 삭제
  await prisma.repo.delete({ where: { id: repoId } });

  return { roomId: repo.roomId };
}
