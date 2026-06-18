import crypto from 'node:crypto';

import { z } from 'zod';

import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import {
  createNotifications,
  getRoomMemberIds,
  resolveMemberIdByLogin,
} from '../services/notifications.service.js';
import { getIO } from '../socket/index.js';
import { TodoEventPayload } from '../socket/socket.types.js';

// 같은 배달(X-GitHub-Delivery) 재처리 방지용 멱등 키 TTL (초)
const WEBHOOK_DEDUP_TTL_SEC = 600;

/*
 * GitHub Webhook payload 의 일부 필드만 사용하므로 필요한 형태만 검증한다.
 * 서명(HMAC)은 통과했더라도 형식이 깨진 페이로드가 핸들러로 들어가 크래시/오작동하지
 * 않도록 zod 로 검증한다. GitHub 실제 payload 엔 더 많은 필드가 있으나 zod object 가
 * 알 수 없는 키는 무시(strip)하므로 사용하는 필드만 정의한다.
 */
const GithubRepositorySchema = z.object({
  name: z.string(),
  owner: z.object({ login: z.string() }),
});

// 공통 envelope — 어느 이벤트든 repository 로 룸/레포를 매핑하는 데 필요
const WebhookBaseSchema = z.object({ repository: GithubRepositorySchema });

const IssuesEventSchema = z.object({
  action: z.string(),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullish(),
    state: z.string(),
    labels: z
      .array(z.union([z.object({ name: z.string() }), z.string()]))
      .optional(),
    assignee: z.object({ login: z.string() }).nullish(),
    assignees: z.array(z.object({ login: z.string() })).optional(),
    html_url: z.string().optional(),
  }),
  sender: z.object({ login: z.string() }).optional(),
  repository: GithubRepositorySchema,
});

const PullRequestEventSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    state: z.string(),
    merged: z.boolean(),
    html_url: z.string().optional(),
  }),
  sender: z.object({ login: z.string() }).optional(),
  repository: GithubRepositorySchema,
});

const PullRequestReviewEventSchema = z.object({
  action: z.string(),
  review: z.object({
    // approved | changes_requested | commented | dismissed
    state: z.string(),
    body: z.string().nullish(),
    html_url: z.string().optional(),
    user: z
      .object({ login: z.string(), avatar_url: z.string().nullish() })
      .nullish(),
  }),
  pull_request: z.object({ number: z.number() }),
  repository: GithubRepositorySchema,
});

const PushEventSchema = z.object({
  ref: z.string(),
  commits: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      url: z.string(),
      author: z.object({ name: z.string().optional() }).optional(),
    }),
  ),
  pusher: z.object({ name: z.string().optional() }).optional(),
  repository: GithubRepositorySchema,
});

type IssuesEventPayload = z.infer<typeof IssuesEventSchema>;
type PullRequestEventPayload = z.infer<typeof PullRequestEventSchema>;
type PullRequestReviewEventPayload = z.infer<
  typeof PullRequestReviewEventSchema
>;
type PushEventPayload = z.infer<typeof PushEventSchema>;

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
  milestoneNumber?: number | null;
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
    milestone_number: todo.milestoneNumber ?? null,
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
 * GitHub 이슈의 담당자(login)를 해당 룸 멤버 User 로 매핑한다.
 * 담당자가 없거나 룸 멤버가 아니면 null (외부 협업자 등).
 */
async function resolveAssigneeId(
  roomId: string,
  issue: IssuesEventPayload['issue'],
): Promise<string | null> {
  const login = issue.assignees?.[0]?.login ?? issue.assignee?.login ?? null;
  if (login === null) {
    return null;
  }

  const member = await prisma.roomMember.findFirst({
    where: { roomId, user: { githubUsername: login } },
    select: { userId: true },
  });

  return member?.userId ?? null;
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
  repoId: string,
  payload: IssuesEventPayload,
): Promise<void> {
  const { action, issue } = payload;
  const io = getIO();

  // Todo 는 레포 단위로 유일(@@unique([repoId, githubIssueNumber])) → repoId 기준 조회
  const existing = await prisma.todo.findFirst({
    where: { repoId, githubIssueNumber: issue.number },
  });

  if (action === 'opened') {
    if (existing !== null) {
      return;
    }

    // GitHub 이슈의 담당자를 룸 멤버로 매핑해 Todo 에 반영
    const assigneeId = await resolveAssigneeId(roomId, issue);

    try {
      const created = await prisma.todo.create({
        data: {
          roomId,
          repoId,
          assigneeId,
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

      /*
       * 알림(영속): 담당자가 있으면 담당자 1명에게만, 없으면 룸 전체.
       * 이슈 발행자(sender)가 룸 멤버면 본인 행동이므로 제외.
       */
      const actorId = await resolveMemberIdByLogin(
        roomId,
        payload.sender?.login,
      );
      const baseTargets =
        assigneeId !== null ? [assigneeId] : await getRoomMemberIds(roomId);
      await createNotifications(
        baseTargets.filter(id => id !== actorId),
        {
          roomId,
          type: 'new_issue',
          message: `새 이슈: ${issue.title}`,
          link: issue.html_url ?? null,
        },
      );
    } catch (error) {
      /*
       * unique(repoId, githubIssueNumber) 위반(P2002) = 앱 생성과 echo 웹훅이
       * 거의 동시에 들어와 이미 같은 이슈의 Todo가 만들어진 경우. 멱등하게 무시한다.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }

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
async function handlePullRequestEvent(
  roomId: string,
  payload: PullRequestEventPayload,
): Promise<void> {
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

  // 알림 대상: 룸 전체에서 행위자(PR 연/머지한 사람) 제외
  const notifyRoomExceptActor = async (
    type: string,
    message: string,
  ): Promise<void> => {
    const actorId = await resolveMemberIdByLogin(roomId, payload.sender?.login);
    const members = await getRoomMemberIds(roomId);
    await createNotifications(
      members.filter(id => id !== actorId),
      { roomId, type, message, link: pr.html_url ?? null },
    );
  };

  if (action === 'opened') {
    io.to(roomId).emit('pr:opened', data);
    await notifyRoomExceptActor(
      'pr_opened',
      `PR 열림: #${pr.number} ${pr.title}`,
    );
    return;
  }

  if (action === 'closed') {
    io.to(roomId).emit(pr.merged ? 'pr:merged' : 'pr:closed', data);
    // 머지된 경우만 알림(영속). 머지 안 된 단순 닫힘은 알림 없음.
    if (pr.merged) {
      await notifyRoomExceptActor(
        'pr_merged',
        `PR 머지됨: #${pr.number} ${pr.title}`,
      );
    }
  }
}

/*
 * PR 리뷰 이벤트 처리. 새 리뷰 제출(submitted)만 실시간 emit 한다.
 * edited/dismissed 는 토스트 가치가 낮아 무시.
 */
async function handlePullRequestReviewEvent(
  roomId: string,
  payload: PullRequestReviewEventPayload,
): Promise<void> {
  const { action, review, pull_request: pr } = payload;

  if (action !== 'submitted') {
    return;
  }

  getIO()
    .to(roomId)
    .emit('pr:reviewed', {
      roomId,
      review: {
        pull_number: pr.number,
        state: review.state,
        reviewer: {
          github_username: review.user?.login ?? '',
          avatar_url: review.user?.avatar_url ?? null,
        },
        body: review.body ?? null,
        url: review.html_url ?? null,
      },
    });

  // 알림(영속): 룸 전체에서 리뷰어 제외
  const actorId = await resolveMemberIdByLogin(roomId, review.user?.login);
  const members = await getRoomMemberIds(roomId);
  await createNotifications(
    members.filter(id => id !== actorId),
    {
      roomId,
      type: 'pr_reviewed',
      message: `PR 리뷰(${review.state}): #${pr.number}`,
      link: review.html_url ?? null,
    },
  );
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
  deliveryId: string | undefined,
  payload: unknown,
): Promise<void> {
  if (event === undefined) {
    return;
  }

  /*
   * 페이로드 형식 검증 (서명은 통과했어도 형식이 깨졌을 수 있음).
   * 형식이 깨진 페이로드는 재시도해도 동일하게 실패하므로 dedup 키를 소비하지 않고 드롭한다.
   */
  const base = WebhookBaseSchema.safeParse(payload);
  if (!base.success) {
    console.warn(`[webhook] repository 누락/형식 오류로 무시 (event=${event})`);
    return;
  }
  const { owner, name } = base.data.repository;
  const fullName = `${owner.login}/${name}`;

  /*
   * 멱등성: 같은 X-GitHub-Delivery 가 중복 배달돼도 한 번만 처리한다.
   * SET NX 로 키를 선점하고, 처리 실패 시 키를 해제해 GitHub 재시도가 다시 처리하게 한다.
   * (형식 검증을 통과한 페이로드에 대해서만 키를 소비한다)
   */
  const dedupKey = deliveryId !== undefined ? `webhook:gh:${deliveryId}` : null;
  if (dedupKey !== null) {
    const acquired = await redis.set(
      dedupKey,
      '1',
      'EX',
      WEBHOOK_DEDUP_TTL_SEC,
      'NX',
    );
    if (acquired === null) {
      return;
    }
  }

  try {
    const repo = await prisma.repo.findFirst({
      where: { fullName },
      select: { id: true, roomId: true },
    });

    if (repo === null) {
      return;
    }

    const { id: repoId, roomId } = repo;

    /*
     * 이벤트별 페이로드를 검증해(safeParse) 통과한 것만 핸들러로 넘긴다.
     * 형식이 어긋나면 드롭(재시도 무의미) — 핸들러 내부 크래시를 사전에 차단.
     */
    switch (event) {
      case 'issues': {
        const parsed = IssuesEventSchema.safeParse(payload);
        if (parsed.success) {
          await handleIssuesEvent(roomId, repoId, parsed.data);
        }
        break;
      }

      case 'pull_request': {
        const parsed = PullRequestEventSchema.safeParse(payload);
        if (parsed.success) {
          await handlePullRequestEvent(roomId, parsed.data);
        }
        break;
      }

      case 'pull_request_review': {
        const parsed = PullRequestReviewEventSchema.safeParse(payload);
        if (parsed.success) {
          await handlePullRequestReviewEvent(roomId, parsed.data);
        }
        break;
      }

      case 'push': {
        const parsed = PushEventSchema.safeParse(payload);
        if (parsed.success) {
          handlePushEvent(roomId, parsed.data);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // 처리 실패 시 멱등 키를 해제해 GitHub 재시도가 다시 처리하도록 한다.
    if (dedupKey !== null) {
      await redis.del(dedupKey).catch(() => {});
    }

    throw error;
  }
}
