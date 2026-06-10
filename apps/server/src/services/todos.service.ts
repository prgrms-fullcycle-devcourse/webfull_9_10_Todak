import type {
  CreateTodosInput,
  GetTodosQuery,
} from '../api/rooms/todos/todos.schema.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { prisma } from '../lib/prisma.js';

import { closeIssue, createIssue } from './github.service.js';

// 깃 이슈 생성
export async function createTodos(
  userId: string,
  roomId: string,
  input: CreateTodosInput,
) {
  const { todos } = input;

  // 1. 룸 멤버 검증
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 2. 룸 + 레포 조회
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { repos: { select: { id: true, fullName: true } } },
  });
  if (room === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const repoId = room.repos[0]?.id ?? null;

  // 3. GitHub 이슈 발행이 필요한지 확인
  const needsGithub = todos.some(t => t.create_issue);

  let accessToken: string | null = null;
  let repoOwner = '';
  let repoName = '';

  if (needsGithub) {
    const repo = room.repos[0] ?? null;
    if (repo === null) {
      throw new AppError('ROOM_REPO_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true },
    });
    if (user?.accessToken === null || user?.accessToken === undefined) {
      throw new AppError('GITHUB_SCOPE_REQUIRED');
    }

    ({ accessToken } = user);
    [repoOwner, repoName] = repo.fullName.split('/');
  }

  // 4. 이슈 발행이 필요한 todo의 담당자 GitHub 유저명 선조회
  const assigneeIds = [
    ...new Set(
      todos
        .filter(
          t =>
            t.create_issue &&
            t.assignee_id !== null &&
            t.assignee_id !== undefined,
        )
        .map(t => t.assignee_id!),
    ),
  ];

  const githubUsernameMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, githubUsername: true },
    });
    for (const a of assignees) {
      githubUsernameMap.set(a.id, a.githubUsername);
    }
  }

  /*
   * 5. GitHub 이슈를 먼저 모두 생성한다(이슈 번호 순서 보장). 인덱스별 이슈 번호를 기록하고,
   *    이후 단계가 실패하면 만든 이슈를 보상(close)해 GitHub-DB 불일치(고아 이슈)를 막는다.
   */
  const issueNumberByIndex = new Map<number, number>();
  const createdIssueNumbers: number[] = [];

  try {
    for (const [index, todo] of todos.entries()) {
      if (!todo.create_issue || accessToken === null) {
        continue;
      }

      const assignees =
        todo.assignee_id !== null &&
        todo.assignee_id !== undefined &&
        githubUsernameMap.has(todo.assignee_id)
          ? [githubUsernameMap.get(todo.assignee_id)!]
          : [];

      const issueNumber = await createIssue(
        accessToken,
        repoOwner,
        repoName,
        todo.title,
        todo.body,
        todo.labels,
        assignees,
      );
      issueNumberByIndex.set(index, issueNumber);
      createdIssueNumbers.push(issueNumber);
    }

    /*
     * 6. Todo 저장(항목별). echo 웹훅이 먼저 같은 이슈의 Todo 를 만들어
     *    unique(repoId, githubIssueNumber) 위반(P2002)이 나는 레이스에서는,
     *    실패·이슈 close 대신 그 Todo 를 앱의 값으로 보강(화해)해 일관되게 처리한다.
     *    (레이스 화해를 위해 단일 트랜잭션 대신 항목별로 처리)
     */
    const createdTodos: Array<Awaited<ReturnType<typeof prisma.todo.create>>> =
      [];

    for (const [index, todo] of todos.entries()) {
      const data = {
        roomId,
        // 이슈가 발행된 항목만 레포에 묶는다 (회의 전용 Todo 는 repoId null 유지)
        repoId: issueNumberByIndex.has(index) ? repoId : null,
        assigneeId: todo.assignee_id ?? null,
        minutesId: todo.minutes_id ?? null,
        title: todo.title,
        body: todo.body ?? null,
        labels: todo.labels,
        githubIssueNumber: issueNumberByIndex.get(index) ?? null,
      };

      try {
        createdTodos.push(await prisma.todo.create({ data }));
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === 'P2002' &&
          data.githubIssueNumber !== null &&
          data.repoId !== null
        ) {
          // 웹훅 echo 가 이미 같은 이슈의 Todo 를 생성함 → 앱 값으로 보강(화해)
          createdTodos.push(
            await prisma.todo.update({
              where: {
                repoId_githubIssueNumber: {
                  repoId: data.repoId,
                  githubIssueNumber: data.githubIssueNumber,
                },
              },
              data: {
                assigneeId: data.assigneeId,
                minutesId: data.minutesId,
                title: data.title,
                body: data.body,
                labels: data.labels,
              },
            }),
          );
        } else {
          throw createError;
        }
      }
    }

    return createdTodos.map(created => ({
      id: created.id,
      room_id: created.roomId,
      repo_id: created.repoId,
      title: created.title,
      body: created.body,
      labels: created.labels,
      assignee_id: created.assigneeId,
      minutes_id: created.minutesId,
      github_issue_number: created.githubIssueNumber,
      is_done: created.isDone,
      created_at: created.createdAt,
    }));
  } catch (error) {
    /*
     * 이슈 생성 중 일부 실패 또는 DB 트랜잭션 실패 시,
     * 이미 만든 GitHub 이슈를 best-effort로 닫아 고아 이슈를 방지한다.
     */
    if (accessToken !== null && createdIssueNumbers.length > 0) {
      const token = accessToken;
      await Promise.allSettled(
        createdIssueNumbers.map(issueNumber =>
          closeIssue(token, repoOwner, repoName, issueNumber),
        ),
      );
    }

    throw error;
  }
}

// 깃 이슈 전체 조회
export async function getTodos(
  userId: string,
  roomId: string,
  query: GetTodosQuery,
) {
  // 룸 멤버 검증
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  const { assignee_id, minutes_id, is_issued } = query;

  const todos = await prisma.todo.findMany({
    where: {
      roomId,
      ...(assignee_id !== undefined && { assigneeId: assignee_id }),
      ...(minutes_id !== undefined && { minutesId: minutes_id }),
      ...(is_issued === true && { githubIssueNumber: { not: null } }),
    },
    include: {
      assignee: {
        select: {
          id: true,
          githubUsername: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return todos.map(todo => ({
    id: todo.id,
    room_id: todo.roomId,
    repo_id: todo.repoId,
    title: todo.title,
    body: todo.body,
    labels: todo.labels,
    github_issue_number: todo.githubIssueNumber,
    is_done: todo.isDone,
    minutes_id: todo.minutesId,
    assignee: todo.assignee
      ? {
          id: todo.assignee.id,
          github_username: todo.assignee.githubUsername,
          avatar_url: todo.assignee.avatarUrl,
        }
      : null,
    created_at: todo.createdAt,
  }));
}

// DB에서 이슈 삭제 + GitHub 이슈 Close
export async function deleteTodo(
  userId: string,
  roomId: string,
  todoId: string,
) {
  // 1. 룸 멤버 검증
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 2. Todo 조회
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, roomId },
    select: { githubIssueNumber: true, repoId: true },
  });
  if (todo === null) {
    throw new AppError('TODO_NOT_FOUND');
  }

  /*
   * 3. GitHub 이슈가 연결돼 있으면, 먼저 닫는 데 성공해야 DB에서도 삭제한다.
   *    토큰/레포가 없거나 close 가 실패하면 삭제를 중단해 GitHub-DB 불일치
   *    (이슈는 열려 있는데 보드 카드만 사라지는 상황)를 방지한다.
   *
   *    단 repoId 가 null 이면 레포 연결이 끊긴(disconnect) Todo 이므로 닫을 레포가
   *    없다. 이 경우 GitHub 닫기를 건너뛰고 보드 카드만 삭제한다(끊긴 카드 삭제 허용).
   */
  if (todo.githubIssueNumber !== null && todo.repoId !== null) {
    /*
     * 이 Todo 가 속한 레포로 이슈를 닫는다. repos[0] 을 쓰면 멀티레포에서
     * 다른 레포의 이슈를 닫으려다 실패할 수 있으므로 todo.repoId 로 정확히 찾는다.
     */
    const repo = await prisma.repo.findUnique({
      where: { id: todo.repoId },
      select: { fullName: true },
    });
    if (repo === null) {
      throw new AppError('ROOM_REPO_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true },
    });
    if (user?.accessToken === null || user?.accessToken === undefined) {
      throw new AppError('GITHUB_SCOPE_REQUIRED');
    }

    const [owner, repoName] = repo.fullName.split('/');
    await closeIssue(user.accessToken, owner, repoName, todo.githubIssueNumber);
  }

  // 4. GitHub 이슈를 정상적으로 닫은 뒤에만 DB에서 삭제
  await prisma.todo.delete({ where: { id: todoId } });
}
