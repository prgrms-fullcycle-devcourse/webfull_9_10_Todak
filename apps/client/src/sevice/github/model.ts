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
