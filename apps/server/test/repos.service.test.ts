/*
 * repos.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - Prisma(DB) 와 github.service(외부 API)를 가짜로 대체(mock)해서
 *     DB·네트워크 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   createGithubRepo : 입력을 github.createRepo 로 위임(레포 생성)
 *   deleteGithubRepo : 레포 존재·멤버십·토큰 검증 후 GitHub 삭제 + DB 삭제
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { createRepo, deleteRepo } from '@/services/github.service.js';
import {
  createGithubRepo,
  deleteGithubRepo,
} from '@/services/repos.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    repo: { findUnique: vi.fn(), delete: vi.fn() },
    roomMember: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// GitHub API 호출(createRepo/deleteRepo)을 가짜로 대체
vi.mock('@/services/github.service.js', () => ({
  createRepo: vi.fn(),
  deleteRepo: vi.fn(),
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const USER_ID = 'user-1';
const REPO_ID = 'repo-1';
const ROOM_ID = 'room-1';

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createGithubRepo', () => {
  it('입력 값을 github.createRepo 로 그대로 위임한다', async () => {
    const created = {
      full_name: 'jiyun/new-repo',
      html_url: 'http://gh/new-repo',
      private: true,
      default_branch: 'main',
    };
    vi.mocked(createRepo).mockResolvedValue(created);

    const result = await createGithubRepo('gho_token', {
      name: 'new-repo',
      private: true,
      auto_init: true,
      org: 'todak-org',
    });

    // 토큰 + 입력 필드 순서대로 위임됐는가
    expect(createRepo).toHaveBeenCalledWith(
      'gho_token',
      'new-repo',
      true,
      'todak-org',
      true,
    );
    expect(result).toEqual(created);
  });
});

describe('deleteGithubRepo', () => {
  it('레포가 없으면 REPO_NOT_FOUND', async () => {
    db.repo.findUnique.mockResolvedValue(null);

    await expectAppError(deleteGithubRepo(USER_ID, REPO_ID), 'REPO_NOT_FOUND');
  });

  it('해당 룸의 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.repo.findUnique.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue(null); // 멤버 아님

    await expectAppError(
      deleteGithubRepo(USER_ID, REPO_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('유저의 GitHub 토큰이 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.repo.findUnique.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.user.findUnique.mockResolvedValue({ accessToken: null }); // 토큰 미동의

    await expectAppError(
      deleteGithubRepo(USER_ID, REPO_ID),
      'GITHUB_SCOPE_REQUIRED',
    );
    // 토큰이 없으면 GitHub 삭제까지 가면 안 됨
    expect(deleteRepo).not.toHaveBeenCalled();
  });

  it('정상이면 GitHub 레포를 삭제하고 DB 에서도 삭제한 뒤 roomId 반환', async () => {
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      roomId: ROOM_ID,
      fullName: 'jiyun/todak',
    });
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(deleteRepo).mockResolvedValue(undefined);
    db.repo.delete.mockResolvedValue({});

    const result = await deleteGithubRepo(USER_ID, REPO_ID);

    // fullName 을 owner/repo 로 쪼개 GitHub 삭제를 호출했는가
    expect(deleteRepo).toHaveBeenCalledWith('gho_token', 'jiyun', 'todak');
    // DB 레코드도 삭제했는가
    expect(db.repo.delete).toHaveBeenCalledWith({ where: { id: REPO_ID } });
    expect(result).toEqual({ roomId: ROOM_ID });
  });
});
