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
 * 캐시는 레포+상태+페이지 단위(토큰 무관) — 같은 레포 PR 목록은 어느 멤버가 봐도 동일하므로
 * 한 명의 조회가 다른 멤버의 캐시도 데워준다. merged/closed 는 동일하게 githubState='closed'
 * 를 받아오므로 같은 캐시 엔트리를 공유한다(필터만 다름).
 */
const PR_LIST_CACHE_TTL_SEC = 30;

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
   * GitHub pulls.list 는 state로 open|closed|all 만 지원한다.
   * merged/closed 는 closed 를 받아온 뒤 merged_at 으로 구분한다.
   */
  const githubState =
    state === 'open' ? 'open' : state === 'all' ? 'all' : 'closed';

  const cacheKey = `pr:list:${owner}/${repoName}:${githubState}:p${page}:l${limit}`;

  let pulls: Awaited<ReturnType<typeof listPullRequests>>;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    pulls = JSON.parse(cached) as Awaited<ReturnType<typeof listPullRequests>>;
  } else {
    pulls = await listPullRequests(
      accessToken,
      owner,
      repoName,
      githubState,
      page,
      limit,
    );
    await redis.set(
      cacheKey,
      JSON.stringify(pulls),
      'EX',
      PR_LIST_CACHE_TTL_SEC,
    );
  }

  // has_more 는 GitHub 원본 페이지 기준(필터 전)으로 다음 페이지 존재 여부 신호
  const hasMore = pulls.length === limit;

  let filtered = pulls;
  if (state === 'merged') {
    filtered = pulls.filter(pr => pr.merged_at !== null);
  } else if (state === 'closed') {
    filtered = pulls.filter(pr => pr.merged_at === null);
  }

  const pullRequests = filtered.map(pr => ({
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
  }));

  return {
    pull_requests: pullRequests,
    pagination: {
      page,
      limit,
      has_more: hasMore,
    },
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
