/*
 * prs.service 의 getPullRequestDetail 유닛 테스트
 * - prisma(룸/멤버/토큰)와 github.service(getPullRequest)를 모킹해 DB·GitHub 없이 검증
 * - 검증: 권한/존재 가드 에러, GitHub PR → 응답 매핑, PR_NOT_FOUND 전파
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import {
  createPullRequestReview as ghCreateReview,
  getPullRequest,
  listPullRequestReviews as ghListReviews,
  listPullRequests as ghListPullRequests,
  mergePullRequest as ghMergePullRequest,
} from '@/services/github.service.js';
import {
  createPullRequestReview,
  getPullRequestDetail,
  getPullRequests,
  mergePullRequest,
} from '@/services/prs.service.js';

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
  listPullRequestReviews: vi.fn(),
  mergePullRequest: vi.fn(),
  createPullRequestReview: vi.fn(),
}));

vi.mock('@/lib/redis.js', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gh = getPullRequest as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ghMerge = ghMergePullRequest as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ghReview = ghCreateReview as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ghList = ghListPullRequests as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ghReviews = ghListReviews as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = redis as any;

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
    // 기본: 리뷰 없음 (리뷰어 테스트에서 개별 주입)
    ghReviews.mockResolvedValue([]);
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
      reviewers: [],
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

  it('리뷰어별 최신 리뷰 1건만 reviewers 로 반환한다', async () => {
    // alice: COMMENTED → APPROVED (최신 APPROVED 유지), bob: CHANGES_REQUESTED
    ghReviews.mockResolvedValue([
      {
        user: { login: 'alice', avatar_url: 'https://avatar/a' },
        state: 'COMMENTED',
        submitted_at: '2026-06-08T00:00:00.000Z',
      },
      {
        user: { login: 'bob', avatar_url: 'https://avatar/b' },
        state: 'CHANGES_REQUESTED',
        submitted_at: '2026-06-08T01:00:00.000Z',
      },
      {
        user: { login: 'alice', avatar_url: 'https://avatar/a' },
        state: 'APPROVED',
        submitted_at: '2026-06-08T02:00:00.000Z',
      },
    ]);

    const result = await getPullRequestDetail(USER_ID, ROOM_ID, PULL_NUMBER);

    expect(ghListReviews).toHaveBeenCalledWith(
      'gh-token',
      'owner',
      'repo',
      PULL_NUMBER,
    );
    expect(result.reviewers).toEqual([
      {
        github_username: 'alice',
        avatar_url: 'https://avatar/a',
        state: 'APPROVED',
        submitted_at: '2026-06-08T02:00:00.000Z',
      },
      {
        github_username: 'bob',
        avatar_url: 'https://avatar/b',
        state: 'CHANGES_REQUESTED',
        submitted_at: '2026-06-08T01:00:00.000Z',
      },
    ]);
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

describe('mergePullRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.roomMember.findFirst.mockResolvedValue({ id: 'membership-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'owner/repo' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gh-token' });
    ghMerge.mockResolvedValue({ merged: true, sha: 'merge-sha-1' });
  });

  it('정상: 머지 후 결과를 반환한다', async () => {
    const result = await mergePullRequest(USER_ID, ROOM_ID, PULL_NUMBER, {
      merge_method: 'squash',
      commit_title: '커밋 제목',
      commit_message: '커밋 본문',
    });

    expect(ghMerge).toHaveBeenCalledWith(
      'gh-token',
      'owner',
      'repo',
      PULL_NUMBER,
      'squash',
      '커밋 제목',
      '커밋 본문',
    );
    expect(result).toEqual({
      merged: true,
      pull_number: PULL_NUMBER,
      merge_commit_sha: 'merge-sha-1',
    });
  });

  it('멤버가 아니면 ROOM_MEMBER_NOT_FOUND (머지 호출 안 함)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);
    await expect(
      mergePullRequest(USER_ID, ROOM_ID, PULL_NUMBER, {
        merge_method: 'squash',
      }),
    ).rejects.toMatchObject({ code: 'ROOM_MEMBER_NOT_FOUND' });
    expect(ghMerge).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 GITHUB_SCOPE_REQUIRED (머지 호출 안 함)', async () => {
    db.user.findUnique.mockResolvedValue({ accessToken: null });
    await expect(
      mergePullRequest(USER_ID, ROOM_ID, PULL_NUMBER, {
        merge_method: 'squash',
      }),
    ).rejects.toMatchObject({ code: 'GITHUB_SCOPE_REQUIRED' });
    expect(ghMerge).not.toHaveBeenCalled();
  });

  it('머지 불가(PR_NOT_MERGEABLE) 전파', async () => {
    const { AppError } = await import('@/errors/AppError.js');
    ghMerge.mockRejectedValue(new AppError('PR_NOT_MERGEABLE'));
    await expect(
      mergePullRequest(USER_ID, ROOM_ID, PULL_NUMBER, {
        merge_method: 'squash',
      }),
    ).rejects.toMatchObject({ code: 'PR_NOT_MERGEABLE' });
  });

  it('충돌(PR_MERGE_CONFLICT) 전파', async () => {
    const { AppError } = await import('@/errors/AppError.js');
    ghMerge.mockRejectedValue(new AppError('PR_MERGE_CONFLICT'));
    await expect(
      mergePullRequest(USER_ID, ROOM_ID, PULL_NUMBER, {
        merge_method: 'squash',
      }),
    ).rejects.toMatchObject({ code: 'PR_MERGE_CONFLICT' });
  });
});

describe('createPullRequestReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.roomMember.findFirst.mockResolvedValue({ id: 'membership-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'owner/repo' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gh-token' });
    ghReview.mockResolvedValue({
      id: 987654,
      state: 'APPROVED',
      submittedAt: '2026-06-08T00:00:00.000Z',
    });
  });

  it('정상: 리뷰 등록 후 결과를 반환한다', async () => {
    const result = await createPullRequestReview(
      USER_ID,
      ROOM_ID,
      PULL_NUMBER,
      { event: 'APPROVE', body: 'LGTM' },
    );

    expect(ghReview).toHaveBeenCalledWith(
      'gh-token',
      'owner',
      'repo',
      PULL_NUMBER,
      'APPROVE',
      'LGTM',
    );
    expect(result).toEqual({
      pull_number: PULL_NUMBER,
      review_id: 987654,
      state: 'APPROVED',
      submitted_at: '2026-06-08T00:00:00.000Z',
    });
  });

  it('멤버가 아니면 ROOM_MEMBER_NOT_FOUND (리뷰 호출 안 함)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);
    await expect(
      createPullRequestReview(USER_ID, ROOM_ID, PULL_NUMBER, {
        event: 'APPROVE',
      }),
    ).rejects.toMatchObject({ code: 'ROOM_MEMBER_NOT_FOUND' });
    expect(ghReview).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 GITHUB_SCOPE_REQUIRED (리뷰 호출 안 함)', async () => {
    db.user.findUnique.mockResolvedValue({ accessToken: null });
    await expect(
      createPullRequestReview(USER_ID, ROOM_ID, PULL_NUMBER, {
        event: 'APPROVE',
      }),
    ).rejects.toMatchObject({ code: 'GITHUB_SCOPE_REQUIRED' });
    expect(ghReview).not.toHaveBeenCalled();
  });

  it('리뷰 불가(PR_REVIEW_NOT_ALLOWED) 전파', async () => {
    const { AppError } = await import('@/errors/AppError.js');
    ghReview.mockRejectedValue(new AppError('PR_REVIEW_NOT_ALLOWED'));
    await expect(
      createPullRequestReview(USER_ID, ROOM_ID, PULL_NUMBER, {
        event: 'APPROVE',
      }),
    ).rejects.toMatchObject({ code: 'PR_REVIEW_NOT_ALLOWED' });
  });
});

describe('getPullRequests - 캐싱', () => {
  // octokit pulls.list 응답 중 사용하는 필드만 담은 가짜 PR
  const fakePull = {
    number: 7,
    title: 'feat: 캐싱',
    state: 'open',
    draft: false,
    merged_at: null,
    user: { login: 'tkdgh7063', avatar_url: 'https://avatar/1' },
    head: { ref: 'feat/cache' },
    base: { ref: 'develop' },
    assignees: [],
    labels: [{ name: 'backend' }],
    created_at: '2026-06-15T00:00:00.000Z',
    updated_at: '2026-06-15T01:00:00.000Z',
    html_url: 'https://github.com/owner/repo/pull/7',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db.roomMember.findFirst.mockResolvedValue({ id: 'membership-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ id: 'repo-1', fullName: 'owner/repo' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
  });

  const query = { state: 'open' as const, page: 1, limit: 30 };
  const cacheKey = 'pr:list:owner/repo:open:p1:l30';

  it('캐시 미스: GitHub 호출 후 결과를 캐시에 저장', async () => {
    r.get.mockResolvedValue(null);
    ghList.mockResolvedValue([fakePull]);

    const res = await getPullRequests(USER_ID, ROOM_ID, query);

    expect(ghList).toHaveBeenCalledOnce();
    // 단기 TTL(30s)로 캐시 저장
    expect(r.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify([fakePull]),
      'EX',
      30,
    );
    expect(res.pull_requests[0].number).toBe(7);
  });

  it('캐시 히트: GitHub 미호출하고 캐시 데이터로 응답', async () => {
    r.get.mockResolvedValue(JSON.stringify([fakePull]));

    const res = await getPullRequests(USER_ID, ROOM_ID, query);

    expect(ghList).not.toHaveBeenCalled();
    expect(r.set).not.toHaveBeenCalled();
    expect(res.pull_requests[0].number).toBe(7);
  });
});

describe('getPullRequests - merged/closed 누적 페이지네이션', () => {
  // merged 여부만 다른 최소 가짜 closed PR
  const mkPull = (number: number, merged: boolean) => ({
    number,
    title: `pr-${number}`,
    state: 'closed',
    draft: false,
    merged_at: merged ? '2026-06-10T00:00:00.000Z' : null,
    user: { login: 'u', avatar_url: null },
    head: { ref: 'h' },
    base: { ref: 'develop' },
    assignees: [],
    labels: [],
    created_at: '2026-06-10T00:00:00.000Z',
    updated_at: '2026-06-10T00:00:00.000Z',
    html_url: `https://github.com/owner/repo/pull/${number}`,
  });

  // GitHub closed 페이지(1-indexed)별 응답을 주입한다 (캐시는 미스)
  const mockClosedPages = (
    pages: Record<number, ReturnType<typeof mkPull>[]>,
  ) => {
    r.get.mockResolvedValue(null);
    ghList.mockImplementation(
      (
        _token: string,
        _owner: string,
        _repo: string,
        _state: string,
        page: number,
      ) => Promise.resolve(pages[page] ?? []),
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db.roomMember.findFirst.mockResolvedValue({ id: 'membership-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ id: 'repo-1', fullName: 'owner/repo' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
  });

  it('merged: closed 여러 페이지를 누적해 정확히 limit 개를 채운다 (+ has_more)', async () => {
    // closed p1 = [merged, unmerged], p2 = [merged, merged] → merged 만 3개
    mockClosedPages({
      1: [mkPull(1, true), mkPull(2, false)],
      2: [mkPull(3, true), mkPull(4, true)],
    });

    const res = await getPullRequests(USER_ID, ROOM_ID, {
      state: 'merged',
      page: 1,
      limit: 2,
    });

    // 필터 후 [1,3] 두 개로 채워짐 (짧은 페이지 아님)
    expect(res.pull_requests.map(p => p.number)).toEqual([1, 3]);
    // 세 번째 merged(4)가 남아 다음 페이지 존재
    expect(res.pagination.has_more).toBe(true);
  });

  it('merged: GitHub 가 소진되면 has_more=false', async () => {
    // closed p1 = [merged, unmerged], p2 = [merged] (limit 미만 → 마지막 페이지)
    mockClosedPages({
      1: [mkPull(1, true), mkPull(2, false)],
      2: [mkPull(3, true)],
    });

    const res = await getPullRequests(USER_ID, ROOM_ID, {
      state: 'merged',
      page: 1,
      limit: 2,
    });

    expect(res.pull_requests.map(p => p.number)).toEqual([1, 3]);
    expect(res.pagination.has_more).toBe(false);
  });

  it('closed(미머지): merged_at=null 만 추려 반환', async () => {
    mockClosedPages({
      1: [mkPull(1, true), mkPull(2, false)],
      2: [mkPull(3, false)],
    });

    const res = await getPullRequests(USER_ID, ROOM_ID, {
      state: 'closed',
      page: 1,
      limit: 2,
    });

    expect(res.pull_requests.map(p => p.number)).toEqual([2, 3]);
    expect(res.pagination.has_more).toBe(false);
  });

  it('스캔 상한(10페이지)에 걸리면 빈 결과라도 has_more=true 로 멈춘다', async () => {
    // 모든 closed 가 unmerged → state=merged 는 영원히 0개. 안전 상한에서 중단돼야 함
    r.get.mockResolvedValue(null);
    ghList.mockResolvedValue([mkPull(1, false), mkPull(2, false)]); // 항상 가득 찬 페이지

    const res = await getPullRequests(USER_ID, ROOM_ID, {
      state: 'merged',
      page: 1,
      limit: 2,
    });

    expect(res.pull_requests).toEqual([]);
    expect(res.pagination.has_more).toBe(true);
    // 무한 루프 방지: 최대 10개 GitHub 페이지만 훑는다
    expect(ghList).toHaveBeenCalledTimes(10);
  });
});
