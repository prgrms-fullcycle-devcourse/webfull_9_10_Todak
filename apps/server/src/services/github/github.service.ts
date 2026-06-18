import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { ErrorCodeKey } from '../../errors/error.code.js';

export function createGithubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

/*
 * GitHub(octokit) 에러를 AppError 로 변환한다.
 * - 401(토큰 만료/무효)은 모든 호출에서 공통으로 GITHUB_REAUTH_REQUIRED 로 변환해
 *   프론트가 GitHub 재로그인을 유도하게 한다.
 * - 그 외 상태코드는 호출부가 overrides 로 의미에 맞는 코드를 지정(없으면 GITHUB_API_ERROR).
 * - RequestError 가 아니면(네트워크 등) 원본 에러를 그대로 다시 던진다.
 */
function mapGithubError(
  err: unknown,
  overrides: Partial<Record<number, ErrorCodeKey>> = {},
): never {
  if (err instanceof RequestError) {
    if (err.status === 401) {
      throw new AppError('GITHUB_REAUTH_REQUIRED');
    }

    const mapped = err.status !== undefined ? overrides[err.status] : undefined;
    throw new AppError(mapped ?? 'GITHUB_API_ERROR');
  }

  throw err;
}

export async function getUserRepos(accessToken: string) {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 30,
    });

    return data;
  } catch (err) {
    // 401(토큰 만료) → GITHUB_REAUTH_REQUIRED, 그 외 → GITHUB_API_ERROR
    mapGithubError(err);
  }
}

export async function createRepo(
  accessToken: string,
  name: string,
  isPrivate: boolean,
  org?: string,
  autoInit: boolean = true,
) {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } =
      org !== undefined
        ? await octokit.repos.createInOrg({
            org,
            name,
            private: isPrivate,
            auto_init: autoInit,
          })
        : await octokit.repos.createForAuthenticatedUser({
            name,
            private: isPrivate,
            auto_init: autoInit,
          });

    return {
      full_name: data.full_name,
      html_url: data.html_url,
      private: data.private,
      default_branch: data.default_branch ?? 'main',
    };
  } catch (err) {
    if (err instanceof RequestError) {
      console.error('[createRepo] GitHub API Error:', err.status, err.message);
    }
    mapGithubError(err, {
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      422: 'CONFLICT',
    });
  }
}

export async function registerWebhook(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<string> {
  const octokit = createGithubClient(accessToken);
  const webhookUrl = `https://webfull910todak-production.up.railway.app/webhooks/github`;

  try {
    const { data } = await octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: env.WEBHOOK_SECRET,
        insecure_ssl: '0',
      },
      events: ['issues', 'pull_request', 'push', 'pull_request_review'],
      active: true,
    });

    return String(data.id);
  } catch (err) {
    if (err instanceof RequestError) {
      if (err.status === 401) {
        throw new AppError('GITHUB_REAUTH_REQUIRED');
      }

      if (err.status === 403) {
        throw new AppError('REPO_ADMIN_REQUIRED');
      }

      if (err.status === 404) {
        throw new AppError('REPO_NOT_FOUND');
      }

      // 422 = 동일한 URL의 webhook이 이미 존재 → 기존 webhook ID 반환
      if (err.status === 422) {
        const { data: hooks } = await octokit.repos.listWebhooks({
          owner,
          repo,
        });
        const existing = hooks.find(h => h.config.url === webhookUrl);
        if (existing !== undefined) {
          return String(existing.id);
        }
        throw new AppError('GITHUB_API_ERROR');
      }

      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
  }
}

export async function unregisterWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  hookId: string,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.repos.deleteWebhook({
      owner,
      repo,
      hook_id: Number(hookId),
    });
  } catch (err) {
    if (err instanceof RequestError) {
      if (err.status === 401) {
        throw new AppError('GITHUB_REAUTH_REQUIRED');
      }

      // 이미 GitHub에서 삭제된 webhook — 무시하고 진행
      if (err.status === 404) {
        return;
      }
    }
    throw err;
  }
}

export async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels: string[] = [],
  assignees: string[] = [],
): Promise<number> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      assignees,
    });

    return data.number;
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

export async function deleteRepo(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.repos.delete({ owner, repo });
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

export type UpdateIssueParams = {
  title?: string;
  body?: string | null;
  labels?: string[];
  assignees?: string[];
  state?: 'open' | 'closed';
  milestone?: number | null;
};

export type IssueComment = {
  id: number;
  body: string;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type RepoMilestone = {
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  dueOn: string | null;
  openIssues: number;
  closedIssues: number;
};

export type IssueEvent = {
  id: number;
  event: string;
  actorLogin: string;
  actorAvatarUrl: string;
  createdAt: string;
  label?: string;
  assignee?: string;
  milestone?: string;
};

export type ReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

export type IssueReaction = {
  id: number;
  content: ReactionContent;
  userLogin: string;
  createdAt: string;
};

export async function updateIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  params: UpdateIssueParams,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...params,
    });
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

export async function closeIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: 'closed',
    });
  } catch (err) {
    if (err instanceof RequestError) {
      if (err.status === 401) {
        throw new AppError('GITHUB_REAUTH_REQUIRED');
      }

      /*
       * 404 = 이슈/레포가 이미 없음. "닫기"의 목표 상태(이슈가 열려 있지 않음)는
       * 이미 달성된 셈이므로 멱등하게 성공 처리한다.
       */
      if (err.status === 404) {
        return;
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
  }
}

export async function listLabelsForRepo(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<Array<{ name: string; color: string; description: string | null }>> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100,
    });

    return data.map(label => ({
      name: label.name,
      color: label.color ?? '',
      description: label.description ?? null,
    }));
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

export async function getPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
) {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data;
  } catch (err) {
    mapGithubError(err, { 404: 'PR_NOT_FOUND' });
  }
}

// PR 의 제출된 리뷰 목록 (리뷰어 + 상태 APPROVED/CHANGES_REQUESTED/COMMENTED/DISMISSED)
export async function listPullRequestReviews(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
) {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    return data;
  } catch (err) {
    mapGithubError(err, { 404: 'PR_NOT_FOUND' });
  }
}

export async function listPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  page: number = 1,
  perPage: number = 30,
) {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      sort: 'created',
      direction: 'desc',
      page,
      per_page: perPage,
    });

    return data;
  } catch (err) {
    mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

export async function mergePullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash',
  commitTitle?: string,
  commitMessage?: string,
): Promise<{ merged: boolean; sha: string }> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
      commit_title: commitTitle,
      commit_message: commitMessage,
    });

    return { merged: data.merged, sha: data.sha };
  } catch (err) {
    mapGithubError(err, {
      403: 'FORBIDDEN',
      404: 'PR_NOT_FOUND',
      // 405 = 머지 불가(드래프트/체크 미통과/이미 닫힘 등)
      405: 'PR_NOT_MERGEABLE',
      // 409 = 충돌 또는 HEAD SHA 불일치
      409: 'PR_MERGE_CONFLICT',
    });
  }
}

export async function createPullRequestReview(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'APPROVE',
  body?: string,
): Promise<{ id: number; state: string; submittedAt: string | null }> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event,
      body,
    });

    return {
      id: data.id,
      state: data.state,
      submittedAt: data.submitted_at ?? null,
    };
  } catch (err) {
    mapGithubError(err, {
      403: 'FORBIDDEN',
      404: 'PR_NOT_FOUND',
      // 422 = 본인 PR 승인 불가 등 리뷰 등록 불가
      422: 'PR_REVIEW_NOT_ALLOWED',
    });
  }
}

// ─── Issue Comments ──────────────────────────────────────────────────────────

export async function listIssueComments(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<IssueComment[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    return data.map(c => ({
      id: c.id,
      body: c.body ?? '',
      authorLogin: c.user?.login ?? '',
      authorAvatarUrl: c.user?.avatar_url ?? '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

export async function createIssueComment(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<IssueComment> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    return {
      id: data.id,
      body: data.body ?? '',
      authorLogin: data.user?.login ?? '',
      authorAvatarUrl: data.user?.avatar_url ?? '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

export async function updateIssueComment(
  accessToken: string,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
): Promise<IssueComment> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });

    return {
      id: data.id,
      body: data.body ?? '',
      authorLogin: data.user?.login ?? '',
      authorAvatarUrl: data.user?.avatar_url ?? '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    return mapGithubError(err, { 404: 'NOT_FOUND' });
  }
}

export async function deleteIssueComment(
  accessToken: string,
  owner: string,
  repo: string,
  commentId: number,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.issues.deleteComment({ owner, repo, comment_id: commentId });
  } catch (err) {
    mapGithubError(err, { 404: 'NOT_FOUND' });
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function listMilestonesForRepo(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<RepoMilestone[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.listMilestones({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    return data.map(m => ({
      number: m.number,
      title: m.title,
      description: m.description ?? null,
      state: m.state as 'open' | 'closed',
      dueOn: m.due_on ?? null,
      openIssues: m.open_issues,
      closedIssues: m.closed_issues,
    }));
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

// ─── Labels CRUD ─────────────────────────────────────────────────────────────

export async function createLabelForRepo(
  accessToken: string,
  owner: string,
  repo: string,
  name: string,
  color: string,
  description?: string,
): Promise<{ name: string; color: string; description: string | null }> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.createLabel({
      owner,
      repo,
      name,
      color,
      description,
    });

    return {
      name: data.name,
      color: data.color ?? '',
      description: data.description ?? null,
    };
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
      422: 'CONFLICT',
    });
  }
}

export async function updateLabelForRepo(
  accessToken: string,
  owner: string,
  repo: string,
  name: string,
  updates: { new_name?: string; color?: string; description?: string },
): Promise<{ name: string; color: string; description: string | null }> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.updateLabel({
      owner,
      repo,
      name,
      new_name: updates.new_name,
      color: updates.color,
      description: updates.description,
    });

    return {
      name: data.name,
      color: data.color ?? '',
      description: data.description ?? null,
    };
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'NOT_FOUND',
    });
  }
}

export async function deleteLabelForRepo(
  accessToken: string,
  owner: string,
  repo: string,
  name: string,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.issues.deleteLabel({ owner, repo, name });
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'NOT_FOUND',
    });
  }
}

// ─── Issue Events ─────────────────────────────────────────────────────────────

export async function listIssueEvents(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<IssueEvent[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.issues.listEvents({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    return data.map(e => {
      const base: IssueEvent = {
        id: e.id,
        event: e.event,
        actorLogin: e.actor?.login ?? '',
        actorAvatarUrl: e.actor?.avatar_url ?? '',
        createdAt: e.created_at ?? new Date().toISOString(),
      };

      const raw = e as Record<string, unknown>;
      if (
        raw['label'] !== null &&
        raw['label'] !== undefined &&
        typeof raw['label'] === 'object'
      ) {
        base.label = (raw['label'] as { name: string }).name;
      }

      if (
        raw['assignee'] !== null &&
        raw['assignee'] !== undefined &&
        typeof raw['assignee'] === 'object'
      ) {
        base.assignee = (raw['assignee'] as { login: string }).login;
      }

      if (
        raw['milestone'] !== null &&
        raw['milestone'] !== undefined &&
        typeof raw['milestone'] === 'object'
      ) {
        base.milestone = (raw['milestone'] as { title: string }).title;
      }

      return base;
    });
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

// ─── Reactions ───────────────────────────────────────────────────────────────

export async function listIssueReactions(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<IssueReaction[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.reactions.listForIssue({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return data.map(r => ({
      id: r.id,
      content: r.content as ReactionContent,
      userLogin: r.user?.login ?? '',
      createdAt: r.created_at,
    }));
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

export async function listIssueCommentReactions(
  accessToken: string,
  owner: string,
  repo: string,
  commentId: number,
): Promise<IssueReaction[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.reactions.listForIssueComment({
      owner,
      repo,
      comment_id: commentId,
    });

    return data.map(r => ({
      id: r.id,
      content: r.content as ReactionContent,
      userLogin: r.user?.login ?? '',
      createdAt: r.created_at,
    }));
  } catch (err) {
    return mapGithubError(err, { 404: 'NOT_FOUND' });
  }
}

export async function createIssueReaction(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  content: ReactionContent,
): Promise<IssueReaction> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.reactions.createForIssue({
      owner,
      repo,
      issue_number: issueNumber,
      content,
    });

    return {
      id: data.id,
      content: data.content as ReactionContent,
      userLogin: data.user?.login ?? '',
      createdAt: data.created_at,
    };
  } catch (err) {
    return mapGithubError(err, { 404: 'REPO_NOT_FOUND' });
  }
}

export async function deleteIssueReaction(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  reactionId: number,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.reactions.deleteForIssue({
      owner,
      repo,
      issue_number: issueNumber,
      reaction_id: reactionId,
    });
  } catch (err) {
    mapGithubError(err, { 404: 'NOT_FOUND' });
  }
}

// ─── Collaborators ────────────────────────────────────────────────────────────

export type CollaboratorPermission =
  | 'pull'
  | 'triage'
  | 'push'
  | 'maintain'
  | 'admin';

export type CollaboratorInfo = {
  login: string;
  avatarUrl: string;
  permission: CollaboratorPermission;
};

export type InvitationInfo = {
  id: number;
  login: string;
  permission: string;
  invitedAt: string;
};

function derivePermission(perms?: {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
  triage?: boolean;
  pull?: boolean;
}): CollaboratorPermission {
  if (!perms) {
    return 'pull';
  }

  if (perms.admin === true) {
    return 'admin';
  }

  if (perms.maintain === true) {
    return 'maintain';
  }

  if (perms.push === true) {
    return 'push';
  }

  if (perms.triage === true) {
    return 'triage';
  }

  return 'pull';
}

/*
 * 1. 협업자 초대 (admin 토큰으로 호출)
 * 201 → 초대 전송됨, invitationId 반환
 * 204 → 이미 협업자, invitationId = null
 */
export async function addCollaborator(
  accessToken: string,
  owner: string,
  repo: string,
  username: string,
  permission: CollaboratorPermission = 'push',
): Promise<{ invitationId: number | null }> {
  const octokit = createGithubClient(accessToken);

  try {
    const response = await octokit.repos.addCollaborator({
      owner,
      repo,
      username,
      permission,
    });

    // status 201 = 초대 발송됨, 204 = 이미 협업자
    const invitationId =
      response.status === 201 ? (response.data as { id: number }).id : null;

    return { invitationId };
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
      422: 'CONFLICT',
    });
  }
}

// 2. 보류 중인 초대 목록
export async function listInvitations(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<InvitationInfo[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.repos.listInvitations({
      owner,
      repo,
      per_page: 100,
    });

    return data.map(inv => ({
      id: inv.id,
      login: inv.invitee?.login ?? '',
      permission: inv.permissions,
      invitedAt: inv.created_at,
    }));
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

// 3. 초대 취소
export async function deleteInvitation(
  accessToken: string,
  owner: string,
  repo: string,
  invitationId: number,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.repos.deleteInvitation({
      owner,
      repo,
      invitation_id: invitationId,
    });
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'NOT_FOUND',
    });
  }
}

// 4. 수락된 협업자 목록
export async function listCollaborators(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<CollaboratorInfo[]> {
  const octokit = createGithubClient(accessToken);

  try {
    const { data } = await octokit.repos.listCollaborators({
      owner,
      repo,
      per_page: 100,
    });

    return data.map(c => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      permission: derivePermission(c.permissions),
    }));
  } catch (err) {
    return mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

// 5. 협업자 제거
export async function removeCollaborator(
  accessToken: string,
  owner: string,
  repo: string,
  username: string,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.repos.removeCollaborator({ owner, repo, username });
  } catch (err) {
    mapGithubError(err, {
      403: 'REPO_ADMIN_REQUIRED',
      404: 'REPO_NOT_FOUND',
    });
  }
}

// 6. 초대 수락 (초대받은 사람의 토큰으로 호출 — joinRoom 자동 수락에 사용)
export async function acceptInvitation(
  accessToken: string,
  invitationId: number,
): Promise<void> {
  const octokit = createGithubClient(accessToken);

  try {
    await octokit.repos.acceptInvitationForAuthenticatedUser({
      invitation_id: invitationId,
    });
  } catch (err) {
    mapGithubError(err, {
      403: 'GITHUB_SCOPE_REQUIRED',
      404: 'NOT_FOUND',
    });
  }
}
