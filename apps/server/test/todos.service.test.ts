/*
 * todos.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - Prisma(DB) 와 github.service(외부 API)를 가짜로 대체(mock)해서
 *     DB·네트워크 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   createTodos : Todo 일괄 생성 (create_issue=true 면 GitHub 이슈도 발행)
 *   getTodos    : 룸의 Todo 목록 (필터링 + snake_case 매핑)
 *   deleteTodo  : Todo 삭제 (GitHub 이슈가 있으면 close 후 DB 삭제)
 *
 * ▷ createTodos 는 입력으로 받은 todos 배열을 "순차" 처리하며,
 *   각 todo 마다 (필요 시) GitHub 이슈를 만들고 → DB 에 저장합니다.
 *   그래서 "이슈 발행 여부(create_issue)"에 따라 createIssue 호출/미호출을 검증합니다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { closeIssue, createIssue } from '@/services/github.service.js';
import { createTodos, deleteTodo, getTodos } from '@/services/todos.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn() },
    room: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    todo: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    /*
     * createTodos 는 모든 Todo 를 단일 트랜잭션으로 저장한다.
     * prisma.$transaction(배열 형태)은 "넘긴 prisma 작업들을 한 번에 실행하고
     * 결과 배열을 돌려주는" 동작이므로, 테스트에선 Promise.all 로 흉내낸다.
     * (배열 안의 prisma.todo.create 들은 이미 mockResolvedValue 로 값이 주입돼 있음)
     */
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

// GitHub 이슈 생성/종료(createIssue/closeIssue)를 가짜로 대체
vi.mock('@/services/github.service.js', () => ({
  createIssue: vi.fn(),
  closeIssue: vi.fn(),
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const USER_ID = 'user-1';
const TODO_ID = 'todo-1';

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createTodos', () => {
  const baseTodo = {
    title: '인증 리팩토링',
    body: '본문',
    labels: ['backend'],
    create_issue: false,
  };

  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      createTodos(USER_ID, ROOM_ID, { todos: [baseTodo] }),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('룸이 없으면 ROOM_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue(null);

    await expectAppError(
      createTodos(USER_ID, ROOM_ID, { todos: [baseTodo] }),
      'ROOM_NOT_FOUND',
    );
  });

  it('create_issue=true 인데 룸에 연결된 레포가 없으면 ROOM_REPO_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID, repos: [] });

    await expectAppError(
      createTodos(USER_ID, ROOM_ID, {
        todos: [{ ...baseTodo, create_issue: true }],
      }),
      'ROOM_REPO_NOT_FOUND',
    );
  });

  it('create_issue=true 인데 GitHub 토큰이 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: null }); // 토큰 미동의

    await expectAppError(
      createTodos(USER_ID, ROOM_ID, {
        todos: [{ ...baseTodo, create_issue: true }],
      }),
      'GITHUB_SCOPE_REQUIRED',
    );
  });

  it('create_issue=false 면 GitHub 이슈 없이 DB 저장만 하고 snake_case 로 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID, repos: [] });
    db.todo.create.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      title: '인증 리팩토링',
      body: '본문',
      labels: ['backend'],
      assigneeId: null,
      minutesId: null,
      githubIssueNumber: null,
      isDone: false,
      createdAt: new Date('2026-05-18T14:02:00.000Z'),
    });

    const result = await createTodos(USER_ID, ROOM_ID, { todos: [baseTodo] });

    // 이슈 발행이 필요 없으니 GitHub 호출은 없어야 함
    expect(createIssue).not.toHaveBeenCalled();
    expect(db.todo.create).toHaveBeenCalledOnce();
    expect(result[0]).toMatchObject({
      id: TODO_ID,
      room_id: ROOM_ID,
      title: '인증 리팩토링',
      github_issue_number: null,
      is_done: false,
    });
  });

  it('create_issue=true 면 담당자 username 으로 GitHub 이슈를 만들고 번호를 DB 에 저장', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    // 담당자(assignee) 의 GitHub username 선조회
    db.user.findMany.mockResolvedValue([
      { id: 'assignee-1', githubUsername: 'jiyun-dev' },
    ]);
    vi.mocked(createIssue).mockResolvedValue(42); // 발행된 이슈 번호
    db.todo.create.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      title: '인증 리팩토링',
      body: '본문',
      labels: ['backend'],
      assigneeId: 'assignee-1',
      minutesId: null,
      githubIssueNumber: 42,
      isDone: false,
      createdAt: new Date('2026-05-18T14:02:00.000Z'),
    });

    const result = await createTodos(USER_ID, ROOM_ID, {
      todos: [
        {
          ...baseTodo,
          create_issue: true,
          assignee_id: 'assignee-1',
        },
      ],
    });

    // owner/repo + 담당자 username 배열로 이슈를 생성했는가
    expect(createIssue).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      '인증 리팩토링',
      '본문',
      ['backend'],
      ['jiyun-dev'],
    );
    // 발행된 이슈 번호가 DB 저장 data 에 들어갔는가
    expect(db.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ githubIssueNumber: 42 }),
      }),
    );
    expect(result[0].github_issue_number).toBe(42);
  });
});

describe('getTodos', () => {
  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      getTodos(USER_ID, ROOM_ID, { is_issued: undefined }),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('필터(assignee/minutes/is_issued)를 where 에 반영하고 snake_case 로 매핑', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findMany.mockResolvedValue([
      {
        id: TODO_ID,
        roomId: ROOM_ID,
        title: '인증 리팩토링',
        body: '본문',
        labels: ['backend'],
        githubIssueNumber: 42,
        isDone: false,
        minutesId: 'minutes-1',
        assignee: {
          id: 'assignee-1',
          githubUsername: 'jiyun-dev',
          avatarUrl: 'http://a/1',
        },
        createdAt: new Date('2026-05-18T14:02:00.000Z'),
      },
    ]);

    const result = await getTodos(USER_ID, ROOM_ID, {
      assignee_id: 'assignee-1',
      minutes_id: 'minutes-1',
      is_issued: true,
    });

    // 필터 조건이 where 에 반영됐는가 (is_issued=true → githubIssueNumber not null)
    expect(db.todo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          roomId: ROOM_ID,
          assigneeId: 'assignee-1',
          minutesId: 'minutes-1',
          githubIssueNumber: { not: null },
        },
      }),
    );
    // 담당자가 snake_case 객체로 매핑됐는가
    expect(result[0]).toMatchObject({
      id: TODO_ID,
      github_issue_number: 42,
      assignee: {
        id: 'assignee-1',
        github_username: 'jiyun-dev',
        avatar_url: 'http://a/1',
      },
    });
  });

  it('담당자가 없으면 assignee 는 null', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findMany.mockResolvedValue([
      {
        id: TODO_ID,
        roomId: ROOM_ID,
        title: '인증 리팩토링',
        body: null,
        labels: [],
        githubIssueNumber: null,
        isDone: false,
        minutesId: null,
        assignee: null,
        createdAt: new Date('2026-05-18T14:02:00.000Z'),
      },
    ]);

    const result = await getTodos(USER_ID, ROOM_ID, { is_issued: undefined });

    expect(result[0].assignee).toBeNull();
  });
});

describe('deleteTodo', () => {
  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      deleteTodo(USER_ID, ROOM_ID, TODO_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('Todo 가 없으면 TODO_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(null);

    await expectAppError(
      deleteTodo(USER_ID, ROOM_ID, TODO_ID),
      'TODO_NOT_FOUND',
    );
  });

  it('GitHub 이슈가 없는 Todo 면 closeIssue 없이 DB 에서만 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      githubIssueNumber: null, // 발행된 이슈 없음
    });
    db.todo.delete.mockResolvedValue({});

    await deleteTodo(USER_ID, ROOM_ID, TODO_ID);

    expect(closeIssue).not.toHaveBeenCalled();
    expect(db.todo.delete).toHaveBeenCalledWith({ where: { id: TODO_ID } });
  });

  it('GitHub 이슈가 있으면 이슈를 close 한 뒤 DB 에서 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      githubIssueNumber: 42, // 발행된 이슈 있음
    });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(closeIssue).mockResolvedValue(undefined);
    db.todo.delete.mockResolvedValue({});

    await deleteTodo(USER_ID, ROOM_ID, TODO_ID);

    // owner/repo + 이슈 번호로 close 를 호출했는가
    expect(closeIssue).toHaveBeenCalledWith('gho_token', 'jiyun', 'todak', 42);
    expect(db.todo.delete).toHaveBeenCalledWith({ where: { id: TODO_ID } });
  });
});
