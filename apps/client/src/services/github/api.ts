import { apiClient } from '@/lib/api';

import type {
  CreatePullRequestReviewParams,
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  FetchRoomPullRequestDetailParams,
  FetchRoomPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
  MergePullRequestParams,
  PullRequestMergeResult,
  PullRequestReviewResult,
  RoomPullRequestDetail,
  PullRequestsResponse,
} from './model';

export type {
  CreatePullRequestReviewParams,
  FetchGitHubPullRequestParams,
  FetchGitHubPullRequestsParams,
  FetchRoomPullRequestDetailParams,
  FetchRoomPullRequestsParams,
  GitHubPullRequest,
  GitHubRepository,
  MergePullRequestParams,
  PullRequestMergeMethod,
  PullRequestMergeResult,
  PullRequestReviewEvent,
  PullRequestReviewResult,
  PullRequestState,
  PullRequestsResponse,
  RoomPullRequestDetail,
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

export function fetchRoomPullRequestDetail({
  roomId,
  pullNumber,
}: FetchRoomPullRequestDetailParams): Promise<RoomPullRequestDetail> {
  return apiClient.get<RoomPullRequestDetail>(
    `/rooms/${roomId}/prs/${pullNumber}`,
  );
}

export function createPullRequestReview({
  body,
  event = 'APPROVE',
  pullNumber,
  roomId,
}: CreatePullRequestReviewParams): Promise<PullRequestReviewResult> {
  return apiClient.post<PullRequestReviewResult>(
    `/rooms/${roomId}/prs/${pullNumber}/reviews`,
    {
      body,
      event,
    },
  );
}

export function mergePullRequest({
  commit_message,
  commit_title,
  merge_method = 'squash',
  pullNumber,
  roomId,
}: MergePullRequestParams): Promise<PullRequestMergeResult> {
  return apiClient.put<PullRequestMergeResult>(
    `/rooms/${roomId}/prs/${pullNumber}/merge`,
    {
      commit_message,
      commit_title,
      merge_method,
    },
  );
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
