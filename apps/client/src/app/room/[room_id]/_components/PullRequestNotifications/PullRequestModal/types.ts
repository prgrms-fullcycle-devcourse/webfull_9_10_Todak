export type PullRequestReviewKind = 'mine' | 'team';

export interface PullRequestModalData {
  id: number;
  title: string;
  updatedAt: string;
  author: string;
  branch: {
    head: string;
    base: string;
  };
  url: string;
  reviewKind: PullRequestReviewKind;
}

export interface PullRequestReviewTabProps {
  onClose: () => void;
}
