import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

/*
 * "룸 멤버가 연결된 레포에 GitHub 작업을 하기 위한 컨텍스트".
 * PR 조회/머지/리뷰 등 여러 서비스가 동일하게 반복하던
 * "멤버 검증 → 룸+레포 조회 → 호스트 토큰 확인 → owner/repo 파싱" 보일러플레이트를 한곳으로 모은다.
 *
 * 멤버 검증 / 룸+레포 / 토큰은 서로 독립적이라 병렬 조회해 왕복을 줄이고,
 * 에러 우선순위는 기존 순차 검증과 동일하게 결과만 순서대로 검사한다.
 */
export interface RoomRepoContext {
  accessToken: string;
  owner: string;
  repoName: string;
  repoId: string;
  fullName: string;
}

export async function getRoomRepoContext(
  roomId: string,
  userId: string,
): Promise<RoomRepoContext> {
  const [membership, room, user] = await Promise.all([
    prisma.roomMember.findFirst({
      where: { roomId, userId },
      select: { id: true },
    }),
    prisma.room.findUnique({
      where: { id: roomId },
      include: { repos: { select: { id: true, fullName: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true },
    }),
  ]);

  // 1. 룸 멤버 검증
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 2. 룸 + 레포 검증
  if (room === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const repo = room.repos[0] ?? null;
  if (repo === null) {
    throw new AppError('ROOM_REPO_NOT_FOUND');
  }

  // 3. GitHub 액세스 토큰 확인
  if (user?.accessToken === null || user?.accessToken === undefined) {
    throw new AppError('GITHUB_SCOPE_REQUIRED');
  }

  const [owner, repoName] = repo.fullName.split('/');

  return {
    accessToken: user.accessToken,
    owner,
    repoName,
    repoId: repo.id,
    fullName: repo.fullName,
  };
}
