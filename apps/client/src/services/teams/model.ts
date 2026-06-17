export type GitHubCollaborator = {
  login: string;
  avatarUrl: string;
  permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin';
};

export type GitHubInvitation = {
  id: number;
  login: string;
  permission: string;
  invitedAt: string;
};
