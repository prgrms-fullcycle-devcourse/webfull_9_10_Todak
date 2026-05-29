import type {
  CreateTodosInput,
  GetTodosQuery,
} from '../api/rooms/todos/todos.schema.js';
import { AppError } from '../errors/AppError.js';
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
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 2. 룸 + 레포 조회
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { repos: true },
  });
  if (room === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  // 2. GitHub 이슈 발행이 필요한지 확인
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

  // 3. 이슈 발행이 필요한 todo의 담당자 GitHub 유저명 선조회
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

  // 4. GitHub 이슈 생성 → DB 저장 (순서 보장을 위해 순차 처리)
  const results = [];

  for (const todo of todos) {
    let githubIssueNumber: number | null = null;

    if (todo.create_issue && accessToken !== null) {
      const assignees =
        todo.assignee_id !== null &&
        todo.assignee_id !== undefined &&
        githubUsernameMap.has(todo.assignee_id)
          ? [githubUsernameMap.get(todo.assignee_id)!]
          : [];

      githubIssueNumber = await createIssue(
        accessToken,
        repoOwner,
        repoName,
        todo.title,
        todo.body,
        todo.labels,
        assignees,
      );
    }

    const created = await prisma.todo.create({
      data: {
        roomId,
        assigneeId: todo.assignee_id ?? null,
        minutesId: todo.minutes_id ?? null,
        title: todo.title,
        body: todo.body ?? null,
        labels: todo.labels,
        githubIssueNumber,
      },
    });

    results.push({
      id: created.id,
      room_id: created.roomId,
      title: created.title,
      body: created.body,
      labels: created.labels,
      assignee_id: created.assigneeId,
      minutes_id: created.minutesId,
      github_issue_number: created.githubIssueNumber,
      is_done: created.isDone,
      created_at: created.createdAt,
    });
  }

  return results;
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
  });
  if (membership === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  // 2. Todo 조회
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, roomId },
  });
  if (todo === null) {
    throw new AppError('TODO_NOT_FOUND');
  }

  // 3. GitHub 이슈가 있으면 Close
  if (todo.githubIssueNumber !== null) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { repos: true },
    });

    const repo = room?.repos[0] ?? null;

    if (repo !== null) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accessToken: true },
      });

      if (user?.accessToken !== null && user?.accessToken !== undefined) {
        const [owner, repoName] = repo.fullName.split('/');
        await closeIssue(
          user.accessToken,
          owner,
          repoName,
          todo.githubIssueNumber,
        );
      }
    }
  }

  // 4. DB에서 삭제
  await prisma.todo.delete({ where: { id: todoId } });
}
