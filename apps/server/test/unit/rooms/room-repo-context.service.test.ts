/*
 * getRoomRepoContext 유닛 테스트
 * - prisma 를 모킹해 멤버/룸/레포/토큰 검증 순서와 성공 시 반환값을 검증
 * - PR 조회/머지/리뷰가 공통으로 의존하는 가드라 에러 우선순위가 중요
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { getRoomRepoContext } from '@/services/rooms/repo/room-repo-context.service.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn() },
    room: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const USER_ID = 'user-1';

async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('getRoomRepoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본값: 전부 정상
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ id: 'repo-1', fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
  });

  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);
    await expectAppError(
      getRoomRepoContext(ROOM_ID, USER_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('룸이 없으면 ROOM_NOT_FOUND', async () => {
    db.room.findUnique.mockResolvedValue(null);
    await expectAppError(
      getRoomRepoContext(ROOM_ID, USER_ID),
      'ROOM_NOT_FOUND',
    );
  });

  it('연결된 레포가 없으면 ROOM_REPO_NOT_FOUND', async () => {
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID, repos: [] });
    await expectAppError(
      getRoomRepoContext(ROOM_ID, USER_ID),
      'ROOM_REPO_NOT_FOUND',
    );
  });

  it('GitHub 토큰이 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.user.findUnique.mockResolvedValue({ accessToken: null });
    await expectAppError(
      getRoomRepoContext(ROOM_ID, USER_ID),
      'GITHUB_SCOPE_REQUIRED',
    );
  });

  it('정상이면 owner/repo/토큰/repoId 를 파싱해 반환', async () => {
    const ctx = await getRoomRepoContext(ROOM_ID, USER_ID);

    expect(ctx).toEqual({
      accessToken: 'gho_token',
      owner: 'jiyun',
      repoName: 'todak',
      repoId: 'repo-1',
      fullName: 'jiyun/todak',
    });
  });
});
