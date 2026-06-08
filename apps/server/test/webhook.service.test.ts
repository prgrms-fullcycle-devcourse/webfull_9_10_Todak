/*
 * webhook.service 의 issues.opened → Todo 생성 시 assignee 매핑 테스트
 * - prisma/redis/socket 를 모킹해 DB·Redis·소켓 없이 검증
 * - 핵심: GitHub 이슈의 assignee(login)를 룸 멤버 User 로 매핑해 assigneeId 설정
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { handleGithubEvent } from '@/services/webhook.service.js';
import { getIO } from '@/socket/index.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    repo: { findFirst: vi.fn() },
    todo: { findFirst: vi.fn(), create: vi.fn() },
    roomMember: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/redis.js', () => ({
  redis: { set: vi.fn(), del: vi.fn() },
}));

vi.mock('@/socket/index.js', () => ({
  getIO: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = redis as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = getIO as any;

const ROOM_ID = 'room-1';

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
    db.repo.findFirst.mockResolvedValue({ roomId: ROOM_ID });
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
});
