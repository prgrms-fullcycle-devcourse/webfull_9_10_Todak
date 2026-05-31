import type { GetPullRequestsQuery } from '../api/rooms/prs/prs.schema.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

import { listPullRequests } from './github.service.js';

// 룸(프로젝트) 레포의 PR 목록 조회
export async function getPullRequests(
  userId: string,
  roomId: string,
  query: GetPullRequestsQuery,
) {
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

  const repo = room.repos[0] ?? null;
  if (repo === null) {
    throw new AppError('ROOM_REPO_NOT_FOUND');
  }

  // 3. GitHub 액세스 토큰 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  });
  if (user?.accessToken === null || user?.accessToken === undefined) {
    throw new AppError('GITHUB_SCOPE_REQUIRED');
  }

  // 4. GitHub API로 PR 목록 조회
  const { state, page, limit } = query;

  /*
   * GitHub pulls.list 는 state로 open|closed|all 만 지원한다.
   * merged/closed 는 closed 를 받아온 뒤 merged_at 으로 구분한다.
   */
  const githubState =
    state === 'open' ? 'open' : state === 'all' ? 'all' : 'closed';

  const [owner, repoName] = repo.fullName.split('/');
  const pulls = await listPullRequests(
    user.accessToken,
    owner,
    repoName,
    githubState,
    page,
    limit,
  );

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
