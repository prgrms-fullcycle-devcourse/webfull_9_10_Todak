export interface PullRequestModalData {
  id: number;
  title: string;
  updatedAt: string;
  author: string;
  state: string;
  isDraft: boolean;
  branch: {
    head: string;
    base: string;
  };
  assignees: string[];
  labels: string[];
  url: string;
}
