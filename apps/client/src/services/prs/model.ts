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
