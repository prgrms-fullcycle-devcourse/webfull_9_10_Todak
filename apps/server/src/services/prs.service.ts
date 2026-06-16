import type {
  CreatePullRequestReviewBody,
  GetPullRequestsQuery,
  MergePullRequestBody,
} from '../api/rooms/prs/prs.schema.js';
import { redis } from '../lib/redis.js';

import {
  createPullRequestReview as createPullRequestReviewOnGithub,
  getPullRequest,
  listPullRequests,
  mergePullRequest as mergePullRequestOnGithub,
} from './github.service.js';
import { getRoomRepoContext } from './room-repo-context.service.js';

/*
 * PR 목록은 매 요청 GitHub 라이브 호출이라 단기 TTL 캐시로 호출수·지연을 줄인다.
 * 캐시는 레포+상태+GitHub페이지 단위(토큰 무관) — 같은 레포 PR 목록은 어느 멤버가 봐도 동일하므로
 * 한 명의 조회가 다른 멤버의 캐시도 데워준다. merged/closed 는 동일하게 githubState='closed'
 * 를 받아오므로 같은 캐시 엔트리를 공유한다(필터만 다름).
 */
const PR_LIST_CACHE_TTL_SEC = 30;

/*
 * merged/closed 는 GitHub closed 한 페이지를 받아 merged_at 으로 가르므로, 한 클라이언트
 * 페이지(limit)를 채우려면 closed 를 여러 장 당겨야 할 수 있다. 무한 스캔을 막는 안전 상한
 * (= 한 요청에서 최대 MAX_CLOSED_PAGES_SCAN*limit 개의 closed PR 만 훑는다).
 */
const MAX_CLOSED_PAGES_SCAN = 10;

type RawPull = Awaited<ReturnType<typeof listPullRequests>>[number];

// GitHub PR 한 페이지를 캐시(레포+상태+페이지 단위)를 거쳐 조회한다.
async function fetchPullsPage(
  accessToken: string,
  owner: string,
  repoName: string,
  githubState: 'open' | 'closed' | 'all',
  page: number,
  limit: number,
): Promise<RawPull[]> {
  const cacheKey = `pr:list:${owner}/${repoName}:${githubState}:p${page}:l${limit}`;

  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as RawPull[];
  }

  const pulls = await listPullRequests(
    accessToken,
    owner,
    repoName,
    githubState,
    page,
    limit,
  );
  await redis.set(cacheKey, JSON.stringify(pulls), 'EX', PR_LIST_CACHE_TTL_SEC);

  return pulls;
}

function formatPullRequest(pr: RawPull) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    is_draft: pr.draft ?? false,
    is_merged: pr.merged_at !== null,
    author: pr.user
      ? {
          github_username: pr.user.login,
          avatar_url: pr.user.avatar_url,
        }
      : null,
    branch: {
      head: pr.head.ref,
      base: pr.base.ref,
    },
    assignees:
      pr.assignees?.map(assignee => ({
        github_username: assignee.login,
        avatar_url: assignee.avatar_url,
      })) ?? [],
    labels: pr.labels.map(label => label.name),
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    html_url: pr.html_url,
  };
}

// 룸(프로젝트) 레포의 PR 목록 조회
export async function getPullRequests(
  userId: string,
  roomId: string,
  query: GetPullRequestsQuery,
) {
  const { accessToken, owner, repoName } = await getRoomRepoContext(
    roomId,
    userId,
  );

  const { state, page, limit } = query;

  /*
   * open/all 은 GitHub 가 그대로 필터해 주므로 단일 페이지 조회로 충분하다.
   * has_more 는 원본 페이지가 가득 찼는지(다음 페이지 존재 가능성)로 판단한다.
   */
  if (state === 'open' || state === 'all') {
    const pulls = await fetchPullsPage(
      accessToken,
      owner,
      repoName,
      state,
      page,
      limit,
    );

    return {
      pull_requests: pulls.map(formatPullRequest),
      pagination: { page, limit, has_more: pulls.length === limit },
    };
  }

  /*
   * merged/closed: GitHub 는 merged 필터를 지원하지 않아 closed 를 받아 merged_at 으로 가른다.
   * closed 한 페이지를 필터하면 limit 보다 짧아지므로, 필터 후 절대 오프셋
   * [(page-1)*limit, page*limit) 구간이 찰 때까지 closed 페이지를 누적해 정확히 limit 개를
   * 반환한다. (빈/짧은 페이지 + has_more 불일치 문제 해소)
   */
  const matches = (pr: RawPull) =>
    state === 'merged' ? pr.merged_at !== null : pr.merged_at === null;

  const wantFrom = (page - 1) * limit;
  const wantTo = page * limit;

  const collected: RawPull[] = [];
  let ghPage = 1;
  let exhausted = false;

  while (ghPage <= MAX_CLOSED_PAGES_SCAN) {
    const raw = await fetchPullsPage(
      accessToken,
      owner,
      repoName,
      'closed',
      ghPage,
      limit,
    );
    collected.push(...raw.filter(matches));

    // GitHub 가 요청보다 적게 반환 = 마지막 페이지 (더 당길 closed 없음)
    if (raw.length < limit) {
      exhausted = true;
      break;
    }

    // 이번 페이지 구간을 넘겨 채웠고 그 너머에 결과가 더 있음
    if (collected.length > wantTo) {
      break;
    }
    ghPage += 1;
  }

  /*
   * 더 있는지: 이번 구간 너머로 이미 모았거나(collected > wantTo),
   * GitHub 를 끝까지 보지 못했으면(스캔 상한 도달) 보수적으로 true.
   */
  const hasMore = collected.length > wantTo || !exhausted;

  return {
    pull_requests: collected.slice(wantFrom, wantTo).map(formatPullRequest),
    pagination: { page, limit, has_more: hasMore },
  };
}

// 룸(프로젝트) 레포의 PR 단건 상세 조회
export async function getPullRequestDetail(
  userId: string,
  roomId: string,
  pullNumber: number,
) {
  const { accessToken, owner, repoName } = await getRoomRepoContext(
    roomId,
    userId,
  );

  const pr = await getPullRequest(accessToken, owner, repoName, pullNumber);

  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    is_draft: pr.draft ?? false,
    is_merged: pr.merged_at !== null,
    // 상세 전용(pulls.get 에만 존재)
    body: pr.body ?? null,
    mergeable: pr.mergeable ?? null,
    // pulls.get 은 user 를 항상 반환(목록의 pulls.list 와 달리 non-null)
    author: {
      github_username: pr.user.login,
      avatar_url: pr.user.avatar_url,
    },
    branch: {
      head: pr.head.ref,
      base: pr.base.ref,
    },
    assignees:
      pr.assignees?.map(assignee => ({
        github_username: assignee.login,
        avatar_url: assignee.avatar_url,
      })) ?? [],
    labels: pr.labels.map(label => label.name),
    changes: {
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
      commits: pr.commits,
    },
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    html_url: pr.html_url,
  };
}

// 룸(프로젝트) 레포의 PR 머지
export async function mergePullRequest(
  userId: string,
  roomId: string,
  pullNumber: number,
  body: MergePullRequestBody,
) {
  const { accessToken, owner, repoName } = await getRoomRepoContext(
    roomId,
    userId,
  );

  const result = await mergePullRequestOnGithub(
    accessToken,
    owner,
    repoName,
    pullNumber,
    body.merge_method,
    body.commit_title,
    body.commit_message,
  );

  return {
    merged: result.merged,
    pull_number: pullNumber,
    merge_commit_sha: result.sha,
  };
}

// 룸(프로젝트) 레포의 PR 리뷰 생성 (승인/변경요청/코멘트)
export async function createPullRequestReview(
  userId: string,
  roomId: string,
  pullNumber: number,
  body: CreatePullRequestReviewBody,
) {
  const { accessToken, owner, repoName } = await getRoomRepoContext(
    roomId,
    userId,
  );

  const result = await createPullRequestReviewOnGithub(
    accessToken,
    owner,
    repoName,
    pullNumber,
    body.event,
    body.body,
  );

  return {
    pull_number: pullNumber,
    review_id: result.id,
    state: result.state,
    submitted_at: result.submittedAt,
  };
}
