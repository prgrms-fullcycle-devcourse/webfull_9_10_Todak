export type PullRequestReviewKind = 'mine' | 'team';

export interface PullRequestModalData {
  id: number;
  title: string;
  updatedAt: string;
  author: string;
  additions: number;
  deletions: number;
  url: string;
  reviewKind: PullRequestReviewKind;
}

export interface PullRequestReviewTabProps {
  onClose: () => void;
}
