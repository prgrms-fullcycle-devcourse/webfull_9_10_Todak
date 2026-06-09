export interface Minute {
  id: string;
  title: string;
  type: string;
  status: string;
  author: Author;
  linked_issue_numbers: number[];
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  github_username: string;
  avatar_url: string;
}

export interface MinutesList {
  minutes: Minute[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    total_count: number;
  };
}
