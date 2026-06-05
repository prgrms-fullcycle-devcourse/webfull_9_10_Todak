import { apiClient } from '@/lib/api';

import type {
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
} from './model';

export type {
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
} from './model';

export function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  return apiClient.get<GitHubRepository[]>('/github/repos');
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
