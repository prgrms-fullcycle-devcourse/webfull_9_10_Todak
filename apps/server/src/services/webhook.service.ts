import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../socket/index.js';
import { TodoEventPayload } from '../socket/socket.types.js';

/*
 * GitHub Webhook payload 의 일부 필드만 사용하므로 필요한 형태만 정의한다.
 * (GitHub 실제 payload 에는 더 많은 필드가 있으나 사용하는 것만 받음)
 */
interface GithubRepository {
  name: string;
  owner: { login: string };
}

interface IssuesEventPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body?: string | null;
    state: string;
    labels?: Array<{ name: string } | string>;
  };
  repository: GithubRepository;
}

interface PullRequestEventPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    state: string;
    merged: boolean;
    html_url?: string;
  };
  repository: GithubRepository;
}

interface PushEventPayload {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    url: string;
    author?: { name?: string };
  }>;
  pusher?: { name?: string };
  repository: GithubRepository;
}

/*
 * X-Hub-Signature-256 검증.
 * GitHub 은 WEBHOOK_SECRET 으로 raw body 를 HMAC-SHA256 한 값을 보낸다.
 * 타이밍 공격 방지를 위해 timingSafeEqual 로 비교한다.
 */
export function verifyGithubSignature(
  payload: Buffer,
  signature: string | undefined,
): boolean {
  if (signature === undefined || signature === '') {
    return false;
  }

  const hmac = crypto.createHmac('sha256', env.WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  // 길이가 다르면 timingSafeEqual 이 throw 하므로 먼저 비교
  if (signatureBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
}

// Todo 레코드 → 소켓 페이로드 (REST 응답과 동일한 snake_case)
function toTodoPayload(todo: {
  id: string;
  roomId: string;
  title: string;
  body: string | null;
  labels: string[];
  assigneeId: string | null;
  minutesId: string | null;
  githubIssueNumber: number | null;
  isDone: boolean;
  createdAt: Date;
}): TodoEventPayload {
  return {
    id: todo.id,
    room_id: todo.roomId,
    title: todo.title,
    body: todo.body,
    labels: todo.labels,
    assignee_id: todo.assigneeId,
    minutes_id: todo.minutesId,
    github_issue_number: todo.githubIssueNumber,
    is_done: todo.isDone,
    created_at: todo.createdAt,
  };
}

// 이슈 라벨 정규화 (객체/문자열 혼재 대비)
function normalizeLabels(
  labels: Array<{ name: string } | string> | undefined,
): string[] {
  if (labels === undefined) {
    return [];
  }

  return labels.map(label => (typeof label === 'string' ? label : label.name));
}

/*
 * issues 이벤트 처리.
 * - opened: 매칭 Todo 없으면 신규 생성(앱 외부에서 만든 이슈도 보드에 반영).
 *   이미 있으면 우리 앱이 만든 이슈의 echo 이므로 무시(중복 방지).
 * - closed/reopened: 매칭 Todo 의 is_done 만 갱신. 없으면 무시
 *   (앱에서 삭제했거나 추적되지 않는 이슈).
 */
async function handleIssuesEvent(
  roomId: string,
  payload: IssuesEventPayload,
): Promise<void> {
  const { action, issue } = payload;
  const io = getIO();

  const existing = await prisma.todo.findFirst({
    where: { roomId, githubIssueNumber: issue.number },
  });

  if (action === 'opened') {
    if (existing !== null) {
      return;
    }

    const created = await prisma.todo.create({
      data: {
        roomId,
        title: issue.title,
        body: issue.body ?? null,
        labels: normalizeLabels(issue.labels),
        githubIssueNumber: issue.number,
        isDone: false,
      },
    });

    io.to(roomId).emit('todo:created', {
      roomId,
      todos: [toTodoPayload(created)],
    });
    return;
  }

  if (action === 'closed' || action === 'reopened') {
    if (existing === null) {
      return;
    }

    const isDone = action === 'closed';
    if (existing.isDone === isDone) {
      return;
    }

    const updated = await prisma.todo.update({
      where: { id: existing.id },
      data: { isDone },
    });

    io.to(roomId).emit('todo:updated', {
      roomId,
      todo: toTodoPayload(updated),
    });
  }
}

/*
 * pull_request 이벤트 처리. PR 은 DB 에 저장하지 않고 소켓만 emit.
 * - opened: pr:opened
 * - closed & merged: pr:merged
 * - closed & !merged: pr:closed
 */
function handlePullRequestEvent(
  roomId: string,
  payload: PullRequestEventPayload,
): void {
  const { action, pull_request: pr } = payload;
  const io = getIO();

  const data = {
    roomId,
    pull_request: {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged,
      url: pr.html_url ?? null,
    },
  };

  if (action === 'opened') {
    io.to(roomId).emit('pr:opened', data);
    return;
  }

  if (action === 'closed') {
    io.to(roomId).emit(pr.merged ? 'pr:merged' : 'pr:closed', data);
  }
}

/*
 * push 이벤트 처리. 커밋이 없는 push(브랜치/태그 삭제 등)는 무시.
 * 알림 토스트용 commit:pushed 를 emit (알림 DB 저장은 보류 중).
 */
function handlePushEvent(roomId: string, payload: PushEventPayload): void {
  const { ref, commits, pusher } = payload;

  if (commits.length === 0) {
    return;
  }

  const io = getIO();

  io.to(roomId).emit('commit:pushed', {
    roomId,
    push: {
      ref,
      branch: ref.replace('refs/heads/', ''),
      pusher: pusher?.name ?? null,
      commits: commits.map(commit => ({
        id: commit.id,
        message: commit.message,
        url: commit.url,
        author: commit.author?.name ?? null,
      })),
    },
  });
}

/*
 * GitHub Webhook 진입점. event 종류에 따라 분기한다.
 * - 매칭되는 Repo(=room) 가 없으면 무시(추적하지 않는 레포 → GitHub 재시도 방지).
 * - 처리하지 않는 event/action 도 무시.
 */
export async function handleGithubEvent(
  event: string | undefined,
  payload: unknown,
): Promise<void> {
  if (event === undefined) {
    return;
  }

  const { repository } = payload as { repository?: GithubRepository };
  if (repository === undefined) {
    return;
  }

  const fullName = `${repository.owner.login}/${repository.name}`;
  const repo = await prisma.repo.findFirst({
    where: { fullName },
    select: { roomId: true },
  });

  if (repo === null) {
    return;
  }

  const { roomId } = repo;

  switch (event) {
    case 'issues':
      await handleIssuesEvent(roomId, payload as IssuesEventPayload);
      break;

    case 'pull_request':
      handlePullRequestEvent(roomId, payload as PullRequestEventPayload);
      break;

    case 'push':
      handlePushEvent(roomId, payload as PushEventPayload);
      break;
    default:
      break;
  }
}
