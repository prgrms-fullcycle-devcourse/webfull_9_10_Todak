export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string | null;
  owner: GitHubUser;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  draft: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  user: GitHubUser | null;
}

export type PullRequestState = 'open' | 'closed' | 'merged' | 'all';

export interface PullRequestUser {
  github_username: string;
  avatar_url: string | null;
}

export interface RoomPullRequest {
  number: number;
  title: string;
  state: string;
  is_draft: boolean;
  is_merged: boolean;
  author: PullRequestUser | null;
  branch: {
    head: string;
    base: string;
  };
  assignees: PullRequestUser[];
  labels: string[];
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  html_url: string;
}

export interface PullRequestsPagination {
  page: number;
  limit: number;
  has_more: boolean;
}

export interface PullRequestsResponse {
  pull_requests: RoomPullRequest[];
  pagination: PullRequestsPagination;
}

export interface FetchRoomPullRequestsParams {
  roomId: string;
  state?: PullRequestState;
  page?: number;
  limit?: number;
}

export interface FetchGitHubPullRequestParams {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface FetchGitHubPullRequestsParams {
  owner: string;
  repo: string;
  pullNumbers: readonly number[];
}
