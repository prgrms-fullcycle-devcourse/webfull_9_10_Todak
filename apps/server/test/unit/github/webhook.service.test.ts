/*
 * webhook.service 의 issues.opened → Todo 생성 시 assignee 매핑 테스트
 * - prisma/redis/socket 를 모킹해 DB·Redis·소켓 없이 검증
 * - 핵심: GitHub 이슈의 assignee(login)를 룸 멤버 User 로 매핑해 assigneeId 설정
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { invalidatePullRequestListCache } from '@/services/rooms/prs/prs.service.js';
import { handleGithubEvent } from '@/services/github/webhook.service.js';
import { getIO } from '@/socket/index.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    repo: { findFirst: vi.fn() },
    todo: { findFirst: vi.fn(), create: vi.fn() },
    roomMember: { findFirst: vi.fn(), findMany: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

vi.mock('@/lib/redis.js', () => ({
  redis: { set: vi.fn(), del: vi.fn() },
}));

vi.mock('@/socket/index.js', () => ({
  getIO: vi.fn(),
}));

// PR 목록 캐시 무효화는 prs.service 의 별도 검증 대상 — 호출 여부만 관찰
vi.mock('@/services/rooms/prs/prs.service.js', () => ({
  invalidatePullRequestListCache: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = redis as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = getIO as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invalidateCache = invalidatePullRequestListCache as any;

const ROOM_ID = 'room-1';
const REPO_ID = 'repo-1';

function openedPayload(assignees?: Array<{ login: string }>) {
  return {
    action: 'opened',
    issue: {
      number: 5,
      title: 'test issue',
      body: null,
      state: 'open',
      labels: [],
      ...(assignees ? { assignees } : {}),
    },
    repository: { name: 'repo', owner: { login: 'owner' } },
  };
}

describe('handleGithubEvent - issues.opened assignee 매핑', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r.set.mockResolvedValue('OK'); // dedup 선점 성공
    r.del.mockResolvedValue(1);
    db.repo.findFirst.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findMany.mockResolvedValue([]); // 알림 수신자 기본 없음
    db.notification.create.mockResolvedValue({
      id: 'noti-1',
      roomId: ROOM_ID,
      type: 'new_issue',
      message: '',
      isRead: false,
      link: null,
      createdAt: new Date(0),
    });
    db.todo.findFirst.mockResolvedValue(null); // 기존 Todo 없음 → 생성
    // create 는 전달된 data 를 그대로 반영한 레코드 반환
    db.todo.create.mockImplementation(async (args: { data: any }) => ({
      id: 'todo-1',
      roomId: ROOM_ID,
      title: args.data.title,
      body: args.data.body ?? null,
      labels: args.data.labels ?? [],
      assigneeId: args.data.assigneeId ?? null,
      minutesId: null,
      githubIssueNumber: args.data.githubIssueNumber ?? null,
      isDone: false,
      createdAt: new Date(0),
    }));
    io.mockReturnValue({ to: () => ({ emit: () => true }) });
  });

  it('담당자가 룸 멤버면 assigneeId 로 매핑', async () => {
    db.roomMember.findFirst.mockResolvedValue({ userId: 'user-1' });

    await handleGithubEvent('issues', 'D1', openedPayload([{ login: 'kim' }]));

    // 룸 멤버 조회가 login 기준으로 됐는지
    expect(db.roomMember.findFirst).toHaveBeenCalledWith({
      where: { roomId: ROOM_ID, user: { githubUsername: 'kim' } },
      select: { userId: true },
    });
    expect(db.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigneeId: 'user-1' }),
      }),
    );
  });

  it('담당자가 룸 멤버가 아니면 assigneeId=null', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await handleGithubEvent(
      'issues',
      'D2',
      openedPayload([{ login: 'outsider' }]),
    );

    expect(db.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigneeId: null }),
      }),
    );
  });

  it('담당자가 없으면 멤버 조회 없이 assigneeId=null', async () => {
    await handleGithubEvent('issues', 'D3', openedPayload());

    expect(db.roomMember.findFirst).not.toHaveBeenCalled();
    expect(db.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigneeId: null }),
      }),
    );
  });

  it('Todo 조회/생성을 repoId 기준으로 한다', async () => {
    await handleGithubEvent('issues', 'D4', openedPayload());

    // 기존 Todo 조회가 roomId 가 아닌 repoId + 이슈번호 기준인지
    expect(db.todo.findFirst).toHaveBeenCalledWith({
      where: { repoId: REPO_ID, githubIssueNumber: 5 },
    });
    // 생성 시 repoId 가 채워지는지
    expect(db.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ repoId: REPO_ID, roomId: ROOM_ID }),
      }),
    );
  });
});

function reviewPayload(action: string) {
  return {
    action,
    review: {
      state: 'approved',
      body: 'LGTM',
      html_url: 'https://github.com/owner/repo/pull/7#review-1',
      user: { login: 'kim', avatar_url: 'https://avatars/kim.png' },
    },
    pull_request: { number: 7 },
    repository: { name: 'repo', owner: { login: 'owner' } },
  };
}

describe('handleGithubEvent - pull_request_review', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let emit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    r.set.mockResolvedValue('OK');
    r.del.mockResolvedValue(1);
    db.repo.findFirst.mockResolvedValue({ roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue(null);
    db.roomMember.findMany.mockResolvedValue([]); // 알림 수신자 기본 없음
    emit = vi.fn();
    io.mockReturnValue({ to: () => ({ emit }) });
  });

  it('submitted 리뷰면 pr:reviewed 를 emit', async () => {
    await handleGithubEvent(
      'pull_request_review',
      'R1',
      reviewPayload('submitted'),
    );

    expect(emit).toHaveBeenCalledWith('pr:reviewed', {
      roomId: ROOM_ID,
      review: {
        pull_number: 7,
        state: 'approved',
        reviewer: {
          github_username: 'kim',
          avatar_url: 'https://avatars/kim.png',
        },
        body: 'LGTM',
        url: 'https://github.com/owner/repo/pull/7#review-1',
      },
    });
  });

  it('submitted 가 아니면(dismissed) emit 안 함', async () => {
    await handleGithubEvent(
      'pull_request_review',
      'R2',
      reviewPayload('dismissed'),
    );

    expect(emit).not.toHaveBeenCalled();
  });
});

describe('handleGithubEvent - 페이로드 형식 검증 (I35)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r.set.mockResolvedValue('OK');
    r.del.mockResolvedValue(1);
    db.repo.findFirst.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.todo.findFirst.mockResolvedValue(null);
    io.mockReturnValue({ to: () => ({ emit: () => true }) });
  });

  it('repository 가 없는(형식 깨진) 페이로드는 dedup 미소비로 드롭', async () => {
    // repository 누락 → 기본 envelope 검증 실패
    await expect(
      handleGithubEvent('issues', 'BAD1', { action: 'opened', issue: {} }),
    ).resolves.toBeUndefined();

    // dedup 키를 소비하지 않고(=재시도 가능) 핸들러로도 안 감
    expect(r.set).not.toHaveBeenCalled();
    expect(db.repo.findFirst).not.toHaveBeenCalled();
    expect(db.todo.create).not.toHaveBeenCalled();
  });

  it('envelope 는 맞지만 이벤트 페이로드가 깨졌으면 핸들러 미호출(드롭, 크래시 X)', async () => {
    // repository 는 정상이나 issue.number 누락 → 이벤트 스키마 검증 실패
    await expect(
      handleGithubEvent('issues', 'BAD2', {
        action: 'opened',
        issue: { title: '번호 없음' },
        repository: { name: 'repo', owner: { login: 'owner' } },
      }),
    ).resolves.toBeUndefined();

    // envelope 통과로 dedup 은 소비되지만, 깨진 페이로드는 핸들러로 안 감
    expect(r.set).toHaveBeenCalledTimes(1);
    expect(db.todo.create).not.toHaveBeenCalled();
  });
});

describe('handleGithubEvent - pull_request 캐시 무효화 (I36)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r.set.mockResolvedValue('OK');
    r.del.mockResolvedValue(1);
    db.repo.findFirst.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue(null);
    db.roomMember.findMany.mockResolvedValue([]);
    invalidateCache.mockResolvedValue(undefined);
    io.mockReturnValue({ to: () => ({ emit: () => true }) });
  });

  it('PR 이벤트 처리 시 해당 레포 PR 목록 캐시를 무효화한다', async () => {
    await handleGithubEvent('pull_request', 'PR1', {
      action: 'opened',
      pull_request: {
        number: 9,
        title: '새 PR',
        state: 'open',
        merged: false,
      },
      repository: { name: 'repo', owner: { login: 'owner' } },
    });

    expect(invalidateCache).toHaveBeenCalledWith('owner', 'repo');
  });
});
