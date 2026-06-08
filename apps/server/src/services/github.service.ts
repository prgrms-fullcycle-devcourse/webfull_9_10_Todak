import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export function createGithubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function getUserRepos(accessToken: string) {
  const octokit = createGithubClient(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 30,
  });

  return data;
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
      if (err.status === 403) {
        throw new AppError('FORBIDDEN');
      }

      if (err.status === 404) {
        throw new AppError('NOT_FOUND');
      }

      if (err.status === 422) {
        throw new AppError('CONFLICT');
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
      events: ['issues', 'pull_request', 'push'],
      active: true,
    });

    return String(data.id);
  } catch (err) {
    if (err instanceof RequestError) {
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
    if (err instanceof RequestError && err.status === 404) {
      // 이미 GitHub에서 삭제된 webhook — 무시하고 진행
      return;
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
    if (err instanceof RequestError) {
      if (err.status === 403) {
        throw new AppError('REPO_ADMIN_REQUIRED');
      }

      if (err.status === 404) {
        throw new AppError('REPO_NOT_FOUND');
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
    if (err instanceof RequestError) {
      if (err.status === 403) {
        throw new AppError('REPO_ADMIN_REQUIRED');
      }

      if (err.status === 404) {
        throw new AppError('REPO_NOT_FOUND');
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
    if (err instanceof RequestError) {
      if (err.status === 404) {
        throw new AppError('PR_NOT_FOUND');
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
    if (err instanceof RequestError) {
      if (err.status === 404) {
        throw new AppError('REPO_NOT_FOUND');
      }
      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
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
    if (err instanceof RequestError) {
      if (err.status === 403) {
        throw new AppError('FORBIDDEN');
      }

      if (err.status === 404) {
        throw new AppError('PR_NOT_FOUND');
      }

      // 405 = 머지 불가(드래프트/체크 미통과/이미 닫힘 등)
      if (err.status === 405) {
        throw new AppError('PR_NOT_MERGEABLE');
      }

      // 409 = 충돌 또는 HEAD SHA 불일치
      if (err.status === 409) {
        throw new AppError('PR_MERGE_CONFLICT');
      }

      throw new AppError('GITHUB_API_ERROR');
    }
    throw err;
  }
}
