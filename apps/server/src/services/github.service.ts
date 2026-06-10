import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodeKey } from '../errors/error.code.js';

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
       * 이미 달성된 셈이므로 멱등하게 성공 처리한다. (unregisterWebhook 과 동일한 방침)
       * 이렇게 하면 GitHub에서 이미 사라진 이슈를 가진 Todo도 삭제가 막히지 않는다.
       */
      if (err.status === 404) {
        return;
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
