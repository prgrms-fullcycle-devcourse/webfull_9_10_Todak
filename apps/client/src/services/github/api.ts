import { apiClient } from '@/lib/api';

import type {
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  FetchRoomPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
  PullRequestsResponse,
} from './model';

export type {
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  FetchRoomPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
  PullRequestState,
  PullRequestsResponse,
  RoomPullRequest,
} from './model';

export function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  return apiClient.get<GitHubRepository[]>('/github/repos');
}

export function fetchRoomPullRequests({
  roomId,
  state = 'open',
  page = 1,
  limit = 30,
}: FetchRoomPullRequestsParams): Promise<PullRequestsResponse> {
  return apiClient.get<PullRequestsResponse>(`/rooms/${roomId}/prs`, {
    params: { limit, page, state },
  });
}

export function fetchGitHubPullRequest({
  owner,
  repo,
  pullNumber,
}: FetchGitHubPullRequestParams): Promise<GitHubPullRequest> {
  return apiClient.get<GitHubPullRequest>(
    `/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
  );
}

export function fetchGitHubPullRequests({
  owner,
  repo,
  pullNumbers,
}: FetchGitHubPullRequestsParams): Promise<GitHubPullRequest[]> {
  return Promise.all(
    pullNumbers.map(pullNumber =>
      fetchGitHubPullRequest({ owner, repo, pullNumber }),
    ),
  );
}
