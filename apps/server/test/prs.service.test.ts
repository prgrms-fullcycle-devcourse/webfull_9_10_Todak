/*
 * prs.service 의 getPullRequestDetail 유닛 테스트
 * - prisma(룸/멤버/토큰)와 github.service(getPullRequest)를 모킹해 DB·GitHub 없이 검증
 * - 검증: 권한/존재 가드 에러, GitHub PR → 응답 매핑, PR_NOT_FOUND 전파
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { getPullRequest } from '@/services/github.service.js';
import { getPullRequestDetail } from '@/services/prs.service.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn() },
    room: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('@/services/github.service.js', () => ({
  getPullRequest: vi.fn(),
  listPullRequests: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gh = getPullRequest as any;

const USER_ID = 'user-1';
const ROOM_ID = 'room-1';
const PULL_NUMBER = 42;

// octokit pulls.get 응답 중 사용하는 필드만 담은 가짜 PR
const fakePr = {
  number: 42,
  title: 'feat: PR 상세 조회 API',
  state: 'open',
  draft: false,
  merged_at: null,
  body: '## 작업\n- 상세 조회',
  mergeable: true,
  user: { login: 'tkdgh7063', avatar_url: 'https://avatar/1' },
  head: { ref: 'feature/pr-detail' },
  base: { ref: 'develop' },
  assignees: [{ login: 'reviewer', avatar_url: 'https://avatar/2' }],
  labels: [{ name: 'backend' }, { name: 'enhancement' }],
  additions: 120,
  deletions: 30,
  changed_files: 8,
  commits: 5,
  created_at: '2026-05-31T00:00:00.000Z',
  updated_at: '2026-05-31T01:00:00.000Z',
  html_url: 'https://github.com/owner/repo/pull/42',
};

describe('getPullRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 모든 가드 통과
    db.roomMember.findFirst.mockResolvedValue({ id: 'membership-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'owner/repo' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gh-token' });
    gh.mockResolvedValue(fakePr);
  });

  it('정상: GitHub PR 을 응답 형식으로 매핑한다', async () => {
    const result = await getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER);

    // getPullRequest 가 owner/repo 분해 + pullNumber 로 호출됐는지
    expect(gh).toHaveBeenCalledWith('gh-token', 'owner', 'repo', PULL_NUMBER);

    expect(result).toEqual({
      number: 42,
      title: 'feat: PR 상세 조회 API',
      state: 'open',
      is_draft: false,
      is_merged: false,
      body: '## 작업\n- 상세 조회',
      mergeable: true,
      author: { github_username: 'tkdgh7063', avatar_url: 'https://avatar/1' },
      branch: { head: 'feature/pr-detail', base: 'develop' },
      assignees: [
        { github_username: 'reviewer', avatar_url: 'https://avatar/2' },
      ],
      labels: ['backend', 'enhancement'],
      changes: {
        additions: 120,
        deletions: 30,
        changed_files: 8,
        commits: 5,
      },
      created_at: '2026-05-31T00:00:00.000Z',
      updated_at: '2026-05-31T01:00:00.000Z',
      merged_at: null,
      html_url: 'https://github.com/owner/repo/pull/42',
    });
  });

  it('merged_at 이 있으면 is_merged=true', async () => {
    gh.mockResolvedValue({
      ...fakePr,
      state: 'closed',
      merged_at: '2026-06-01T00:00:00.000Z',
    });

    const result = await getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER);
    expect(result.is_merged).toBe(true);
  });

  it('멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);
    await expect(
      getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER),
    ).rejects.toMatchObject({ code: 'ROOM_MEMBER_NOT_FOUND' });
    expect(gh).not.toHaveBeenCalled();
  });

  it('룸이 없으면 ROOM_NOT_FOUND', async () => {
    db.room.findUnique.mockResolvedValue(null);
    await expect(
      getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER),
    ).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  });

  it('레포가 연결 안 됐으면 ROOM_REPO_NOT_FOUND', async () => {
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID, repos: [] });
    await expect(
      getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER),
    ).rejects.toMatchObject({ code: 'ROOM_REPO_NOT_FOUND' });
  });

  it('토큰이 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.user.findUnique.mockResolvedValue({ accessToken: null });
    await expect(
      getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER),
    ).rejects.toMatchObject({ code: 'GITHUB_SCOPE_REQUIRED' });
    expect(gh).not.toHaveBeenCalled();
  });

  it('GitHub 에서 PR 을 못 찾으면 PR_NOT_FOUND 전파', async () => {
    const { AppError } = await import('@/errors/AppError.js');
    gh.mockRejectedValue(new AppError('PR_NOT_FOUND'));
    await expect(
      getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER),
    ).rejects.toMatchObject({ code: 'PR_NOT_FOUND' });
  });
});
