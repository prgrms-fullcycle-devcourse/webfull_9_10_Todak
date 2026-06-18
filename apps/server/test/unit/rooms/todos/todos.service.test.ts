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

import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';
import {
  closeIssue,
  createIssue,
  createIssueComment,
  createIssueReaction,
  createLabelForRepo,
  deleteIssueComment,
  deleteIssueReaction,
  deleteLabelForRepo,
  listIssueCommentReactions,
  listIssueComments,
  listIssueEvents,
  listIssueReactions,
  listLabelsForRepo,
  listMilestonesForRepo,
  updateIssue,
  updateIssueComment,
  updateLabelForRepo,
} from '@/services/github/github.service.js';
import {
  createNotifications,
  getRoomMemberIds,
} from '@/services/notifications/notifications.service.js';
import {
  createTodoComment,
  createTodoLabel,
  createTodoReaction,
  createTodos,
  deleteTodo,
  deleteTodoComment,
  deleteTodoLabel,
  deleteTodoReaction,
  getTodo,
  getTodoComments,
  getTodoEvents,
  getTodoLabels,
  getTodoMilestones,
  getTodos,
  updateTodo,
} from '@/services/rooms/todos/todos.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn(), findMany: vi.fn() },
    room: { findUnique: vi.fn() },
    repo: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    todo: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    /*
     * (레거시) createTodos 는 과거 단일 트랜잭션으로 저장했으나, echo 웹훅 레이스 화해를
     * 위해 현재는 항목별 create/update(P2002 시 보강)로 처리한다.
     * $transaction 모킹은 호환용으로 남겨둔다.
     */
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

// GitHub 이슈 생성/종료(createIssue/closeIssue)를 가짜로 대체
vi.mock('@/services/github.service.js', () => ({
  createIssue: vi.fn(),
  closeIssue: vi.fn(),
  updateIssue: vi.fn(),
  listLabelsForRepo: vi.fn(),
  listIssueReactions: vi.fn(),
  listIssueCommentReactions: vi.fn(),
  listIssueComments: vi.fn(),
  createIssueComment: vi.fn(),
  updateIssueComment: vi.fn(),
  deleteIssueComment: vi.fn(),
  listMilestonesForRepo: vi.fn(),
  listIssueEvents: vi.fn(),
  createIssueReaction: vi.fn(),
  deleteIssueReaction: vi.fn(),
  createLabelForRepo: vi.fn(),
  updateLabelForRepo: vi.fn(),
  deleteLabelForRepo: vi.fn(),
}));

// 알림(영속/소켓)은 best-effort 부수효과라 가짜로 대체 — 호출 인자만 관찰
vi.mock('@/services/notifications.service.js', () => ({
  createNotifications: vi.fn(),
  getRoomMemberIds: vi.fn(),
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const USER_ID = 'user-1';
const TODO_ID = 'todo-1';
const REPO_ID = 'repo-1';

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
    // 담당자(assignee) 의 GitHub username 선조회 — 룸 멤버 검증 겸용
    db.roomMember.findMany.mockResolvedValue([
      { userId: 'assignee-1', user: { githubUsername: 'jiyun-dev' } },
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

    // new_issue 알림: 담당자(assignee-1)에게만, 생성자(user-1) 제외
    expect(createNotifications).toHaveBeenCalledTimes(1);
    expect(createNotifications).toHaveBeenCalledWith(
      ['assignee-1'],
      expect.objectContaining({
        roomId: ROOM_ID,
        type: 'new_issue',
        link: 'https://github.com/jiyun/todak/issues/42',
      }),
    );
    // 담당자가 지정돼 룸 전체 조회는 하지 않는다
    expect(getRoomMemberIds).not.toHaveBeenCalled();
  });

  it('담당자 없는 새 이슈는 룸 전체에 알림(생성자 제외)', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(createIssue).mockResolvedValue(7);
    db.todo.create.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      title: '문서 정리',
      body: null,
      labels: [],
      assigneeId: null,
      minutesId: null,
      githubIssueNumber: 7,
      isDone: false,
      createdAt: new Date('2026-05-18T14:02:00.000Z'),
    });
    vi.mocked(getRoomMemberIds).mockResolvedValue([USER_ID, 'member-2']);

    await createTodos(USER_ID, ROOM_ID, {
      todos: [{ ...baseTodo, create_issue: true, assignee_id: undefined }],
    });

    // 담당자 없으면 룸 전체에서 생성자(user-1)만 빼고 알림
    expect(getRoomMemberIds).toHaveBeenCalledWith(ROOM_ID);
    expect(createNotifications).toHaveBeenCalledWith(
      ['member-2'],
      expect.objectContaining({ type: 'new_issue' }),
    );
  });

  it('담당자가 룸 멤버가 아니면 BAD_REQUEST (크로스룸 배정 차단)', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    // 룸 멤버 조회 결과가 비어 있음 = 지정한 담당자가 이 룸의 멤버가 아님
    db.roomMember.findMany.mockResolvedValue([]);

    await expectAppError(
      createTodos(USER_ID, ROOM_ID, {
        todos: [{ ...baseTodo, create_issue: true, assignee_id: 'outsider-1' }],
      }),
      'BAD_REQUEST',
    );

    // 검증 실패 시 GitHub 이슈/DB 생성으로 진행하지 않는다
    expect(createIssue).not.toHaveBeenCalled();
    expect(db.todo.create).not.toHaveBeenCalled();
  });

  it('레이스(P2002): 웹훅이 만든 Todo 를 update 로 보강(화해)한다', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ id: REPO_ID, fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    db.roomMember.findMany.mockResolvedValue([
      { userId: 'assignee-1', user: { githubUsername: 'jiyun-dev' } },
    ]);
    vi.mocked(createIssue).mockResolvedValue(42);

    // 앱 todo.create 가 unique 위반(P2002) → echo 웹훅이 이미 같은 이슈의 Todo 를 만든 상황
    const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    db.todo.create.mockRejectedValue(p2002);
    db.todo.update.mockResolvedValue({
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
      todos: [{ ...baseTodo, create_issue: true, assignee_id: 'assignee-1' }],
    });

    // unique(repoId, githubIssueNumber) 키로 기존 Todo 를 앱 값으로 보강
    expect(db.todo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repoId_githubIssueNumber: { repoId: REPO_ID, githubIssueNumber: 42 },
        },
        data: expect.objectContaining({ assigneeId: 'assignee-1' }),
      }),
    );
    // 실패·이슈 close 없이 일관 처리
    expect(closeIssue).not.toHaveBeenCalled();
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

  it('레포 연결이 끊긴(repoId=null) Todo 는 close 없이 카드만 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      repoId: null, // 레포 disconnect 로 연결 끊김(onDelete: SetNull)
      githubIssueNumber: 42, // 과거 발행 이슈 번호는 남아 있음
    });
    db.todo.delete.mockResolvedValue({});

    await deleteTodo(USER_ID, ROOM_ID, TODO_ID);

    // 닫을 레포가 없으므로 GitHub 닫기는 스킵, 카드만 삭제
    expect(db.repo.findUnique).not.toHaveBeenCalled();
    expect(closeIssue).not.toHaveBeenCalled();
    expect(db.todo.delete).toHaveBeenCalledWith({ where: { id: TODO_ID } });
  });

  it('GitHub 이슈가 있으면 이슈를 close 한 뒤 DB 에서 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      repoId: REPO_ID, // Todo 가 속한 레포
      githubIssueNumber: 42, // 발행된 이슈 있음
    });
    // 멀티레포 정합성: todo.repoId 로 정확한 레포를 찾아 이슈를 닫는다
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      fullName: 'jiyun/todak',
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(closeIssue).mockResolvedValue(undefined);
    db.todo.delete.mockResolvedValue({});

    await deleteTodo(USER_ID, ROOM_ID, TODO_ID);

    // 올바른 레포(todo.repoId)로 조회했는가
    expect(db.repo.findUnique).toHaveBeenCalledWith({
      where: { id: REPO_ID },
      select: { fullName: true },
    });
    // owner/repo + 이슈 번호로 close 를 호출했는가
    expect(closeIssue).toHaveBeenCalledWith('gho_token', 'jiyun', 'todak', 42);
    expect(db.todo.delete).toHaveBeenCalledWith({ where: { id: TODO_ID } });
  });
});

describe('updateTodo', () => {
  const existingTodo = {
    id: TODO_ID,
    roomId: ROOM_ID,
    repoId: REPO_ID,
    title: '인증 리팩토링',
    body: '본문',
    labels: ['backend'],
    githubIssueNumber: 42,
    isDone: false,
    minutesId: null,
    assigneeId: null,
    createdAt: new Date('2026-05-18T14:02:00.000Z'),
  };

  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      updateTodo(USER_ID, ROOM_ID, TODO_ID, { title: '수정' }),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('Todo 가 없으면 TODO_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(null);

    await expectAppError(
      updateTodo(USER_ID, ROOM_ID, TODO_ID, { title: '수정' }),
      'TODO_NOT_FOUND',
    );
  });

  it('GitHub 이슈가 없으면 updateIssue 없이 DB 만 수정', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      ...existingTodo,
      githubIssueNumber: null,
      repoId: null,
    });
    db.todo.update.mockResolvedValue({
      ...existingTodo,
      title: '수정됨',
      githubIssueNumber: null,
      repoId: null,
      assignee: null,
    });

    const result = await updateTodo(USER_ID, ROOM_ID, TODO_ID, {
      title: '수정됨',
    });

    expect(updateIssue).not.toHaveBeenCalled();
    expect(result.title).toBe('수정됨');
  });

  it('GitHub 이슈가 있으면 updateIssue 후 DB 수정', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(existingTodo);
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      fullName: 'jiyun/todak',
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(updateIssue).mockResolvedValue(undefined);
    db.todo.update.mockResolvedValue({
      ...existingTodo,
      isDone: true,
      milestoneNumber: null,
      assignee: null,
    });

    const result = await updateTodo(USER_ID, ROOM_ID, TODO_ID, {
      is_done: true,
    });

    expect(updateIssue).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
      { state: 'closed' },
    );
    expect(result.is_done).toBe(true);
  });

  it('milestone_number 를 전달하면 GitHub milestone 과 DB 모두 갱신', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(existingTodo);
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      fullName: 'jiyun/todak',
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(updateIssue).mockResolvedValue(undefined);
    db.todo.update.mockResolvedValue({
      ...existingTodo,
      milestoneNumber: 2,
      assignee: null,
    });

    const result = await updateTodo(USER_ID, ROOM_ID, TODO_ID, {
      milestone_number: 2,
    });

    expect(updateIssue).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
      { milestone: 2 },
    );
    expect(result.milestone_number).toBe(2);
  });

  it('repoId=null Todo 는 GitHub 호출 없이 DB 만 수정', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      ...existingTodo,
      repoId: null,
    });
    db.todo.update.mockResolvedValue({
      ...existingTodo,
      repoId: null,
      title: '로컬 수정',
      assignee: null,
    });

    await updateTodo(USER_ID, ROOM_ID, TODO_ID, { title: '로컬 수정' });

    expect(updateIssue).not.toHaveBeenCalled();
    expect(db.repo.findUnique).not.toHaveBeenCalled();
  });

  it('GitHub 연결 Todo 에서 accessToken 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(existingTodo);
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      fullName: 'jiyun/todak',
    });
    db.user.findUnique.mockResolvedValue({ accessToken: null });

    await expectAppError(
      updateTodo(USER_ID, ROOM_ID, TODO_ID, { is_done: true }),
      'GITHUB_SCOPE_REQUIRED',
    );

    expect(updateIssue).not.toHaveBeenCalled();
  });

  it('assignee_ids 로 복수 담당자 지정하면 GitHub assignees 에 username 배열 전달', async () => {
    const ASSIGNEE_ID = 'user-assignee-1';

    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(existingTodo);
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      fullName: 'jiyun/todak',
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    // 담당자 룸 멤버 검증 겸 username 조회
    db.roomMember.findMany.mockResolvedValue([
      { user: { githubUsername: 'assignee-github' } },
    ]);
    vi.mocked(updateIssue).mockResolvedValue(undefined);
    db.todo.update.mockResolvedValue({
      ...existingTodo,
      assigneeId: ASSIGNEE_ID,
      milestoneNumber: null,
      assignee: {
        id: ASSIGNEE_ID,
        githubUsername: 'assignee-github',
        avatarUrl: null,
      },
    });

    const result = await updateTodo(USER_ID, ROOM_ID, TODO_ID, {
      assignee_ids: [ASSIGNEE_ID],
    });

    expect(updateIssue).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
      { assignees: ['assignee-github'] },
    );
    expect(result.assignee?.github_username).toBe('assignee-github');
  });
});

describe('getTodoLabels', () => {
  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      getTodoLabels(USER_ID, ROOM_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('연결 레포가 없으면 ROOM_REPO_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID, repos: [] });

    await expectAppError(
      getTodoLabels(USER_ID, ROOM_ID),
      'ROOM_REPO_NOT_FOUND',
    );
  });

  it('레포 라벨 목록을 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(listLabelsForRepo).mockResolvedValue([
      { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
    ]);

    const result = await getTodoLabels(USER_ID, ROOM_ID);

    expect(listLabelsForRepo).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
    );
    expect(result).toEqual([
      { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
    ]);
  });
});

// ─── getTodo ──────────────────────────────────────────────────────────────────

describe('getTodo', () => {
  const todoRow = {
    id: TODO_ID,
    roomId: ROOM_ID,
    repoId: REPO_ID,
    title: '인증 리팩토링',
    body: '본문',
    labels: ['backend'],
    githubIssueNumber: 42,
    milestoneNumber: 1,
    isDone: false,
    minutesId: null,
    assigneeId: null,
    createdAt: new Date('2026-05-18T14:02:00.000Z'),
    assignee: null,
  };

  it('룸 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);
    await expectAppError(
      getTodo(USER_ID, ROOM_ID, TODO_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('Todo 가 없으면 TODO_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(null);
    await expectAppError(getTodo(USER_ID, ROOM_ID, TODO_ID), 'TODO_NOT_FOUND');
  });

  it('Todo 를 snake_case 로 반환 (reactions 포함)', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(todoRow);
    db.repo.findUnique.mockResolvedValue({ fullName: 'jiyun/todak' });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(listIssueReactions).mockResolvedValue([]);

    const result = await getTodo(USER_ID, ROOM_ID, TODO_ID);

    expect(result.id).toBe(TODO_ID);
    expect(result.milestone_number).toBe(1);
    expect(result.assignee).toBeNull();
    expect(result.reactions).toEqual([]);
  });
});

// ─── getTodoComments ──────────────────────────────────────────────────────────

describe('getTodoComments', () => {
  const linkedTodo = {
    id: TODO_ID,
    roomId: ROOM_ID,
    repoId: REPO_ID,
    githubIssueNumber: 42,
  };

  it('GitHub 이슈 미연결이면 TODO_GITHUB_NOT_LINKED', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      ...linkedTodo,
      githubIssueNumber: null,
    });

    await expectAppError(
      getTodoComments(USER_ID, ROOM_ID, TODO_ID),
      'TODO_GITHUB_NOT_LINKED',
    );
  });

  it('댓글 목록을 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue(linkedTodo);
    db.repo.findUnique.mockResolvedValue({ fullName: 'jiyun/todak' });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(listIssueComments).mockResolvedValue([
      {
        id: 1,
        body: '댓글입니다',
        authorLogin: 'dev1',
        authorAvatarUrl: '',
        createdAt: '2026-05-18T00:00:00Z',
        updatedAt: '2026-05-18T00:00:00Z',
      },
    ]);
    vi.mocked(listIssueCommentReactions).mockResolvedValue([]);

    const result = await getTodoComments(USER_ID, ROOM_ID, TODO_ID);

    expect(listIssueComments).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
    );
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('댓글입니다');
    expect(result[0].reactions).toEqual([]);
  });
});

// ─── createTodoComment ────────────────────────────────────────────────────────

describe('createTodoComment', () => {
  it('댓글을 GitHub 에 작성하고 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      repoId: REPO_ID,
      githubIssueNumber: 42,
    });
    db.repo.findUnique.mockResolvedValue({ fullName: 'jiyun/todak' });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    const mockComment = {
      id: 99,
      body: '완료',
      authorLogin: 'me',
      authorAvatarUrl: '',
      createdAt: '',
      updatedAt: '',
    };
    vi.mocked(createIssueComment).mockResolvedValue(mockComment);

    const result = await createTodoComment(USER_ID, ROOM_ID, TODO_ID, '완료');

    expect(createIssueComment).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
      '완료',
    );
    expect(result.id).toBe(99);
  });
});

// ─── getTodoMilestones ────────────────────────────────────────────────────────

describe('getTodoMilestones', () => {
  it('마일스톤 목록을 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(listMilestonesForRepo).mockResolvedValue([
      {
        number: 1,
        title: 'Sprint 1',
        description: null,
        state: 'open',
        dueOn: null,
        openIssues: 5,
        closedIssues: 2,
      },
    ]);

    const result = await getTodoMilestones(USER_ID, ROOM_ID);

    expect(listMilestonesForRepo).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
    );
    expect(result[0].number).toBe(1);
  });
});

// ─── createTodoLabel ──────────────────────────────────────────────────────────

describe('createTodoLabel', () => {
  it('라벨을 GitHub 레포에 생성', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      repos: [{ fullName: 'jiyun/todak' }],
    });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(createLabelForRepo).mockResolvedValue({
      name: 'hotfix',
      color: 'e11d48',
      description: null,
    });

    const result = await createTodoLabel(USER_ID, ROOM_ID, 'hotfix', 'e11d48');

    expect(createLabelForRepo).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      'hotfix',
      'e11d48',
      undefined,
    );
    expect(result.name).toBe('hotfix');
  });
});

// ─── createTodoReaction ───────────────────────────────────────────────────────

describe('createTodoReaction', () => {
  it('GitHub 이슈에 리액션 추가', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.todo.findFirst.mockResolvedValue({
      id: TODO_ID,
      roomId: ROOM_ID,
      repoId: REPO_ID,
      githubIssueNumber: 42,
    });
    db.repo.findUnique.mockResolvedValue({ fullName: 'jiyun/todak' });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(createIssueReaction).mockResolvedValue({
      id: 777,
      content: '+1',
      userLogin: 'me',
      createdAt: '',
    });

    const result = await createTodoReaction(USER_ID, ROOM_ID, TODO_ID, '+1');

    expect(createIssueReaction).toHaveBeenCalledWith(
      'gho_token',
      'jiyun',
      'todak',
      42,
      '+1',
    );
    expect(result.content).toBe('+1');
  });
});
