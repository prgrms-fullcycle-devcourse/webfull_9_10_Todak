/*
 * github.service 의 octokit 에러 → AppError 매핑 테스트
 * - @octokit/rest 를 모킹해 octokit 메서드가 RequestError 를 던지게 한 뒤 매핑 검증
 * - 핵심: 401(토큰 만료) → GITHUB_REAUTH_REQUIRED 공통 변환, 함수별 override, 폴백 GITHUB_API_ERROR
 */
import { RequestError } from '@octokit/request-error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockMerge = vi.fn();
const mockList = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    pulls = { get: mockGet, merge: mockMerge, list: mockList };
  },
}));

import {
  getPullRequest,
  listPullRequests,
  mergePullRequest,
} from '@/services/github/github.service.js';

function ghError(status: number) {
  return new RequestError('boom', status, {
    request: { method: 'GET', url: 'https://api.github.com', headers: {} },
  });
}

describe('github.service 에러 매핑', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('401 → GITHUB_REAUTH_REQUIRED (토큰 만료 공통)', async () => {
    mockGet.mockRejectedValue(ghError(401));

    await expect(getPullRequest('t', 'o', 'r', 1)).rejects.toMatchObject({
      code: 'GITHUB_REAUTH_REQUIRED',
      statusCode: 401,
    });
  });

  it('404 → 함수별 override (PR_NOT_FOUND)', async () => {
    mockGet.mockRejectedValue(ghError(404));

    await expect(getPullRequest('t', 'o', 'r', 1)).rejects.toMatchObject({
      code: 'PR_NOT_FOUND',
    });
  });

  it('매핑 없는 상태(500) → GITHUB_API_ERROR 폴백', async () => {
    mockGet.mockRejectedValue(ghError(500));

    await expect(getPullRequest('t', 'o', 'r', 1)).rejects.toMatchObject({
      code: 'GITHUB_API_ERROR',
    });
  });

  it('listPullRequests 401 → GITHUB_REAUTH_REQUIRED', async () => {
    mockList.mockRejectedValue(ghError(401));

    await expect(listPullRequests('t', 'o', 'r')).rejects.toMatchObject({
      code: 'GITHUB_REAUTH_REQUIRED',
    });
  });

  it('mergePullRequest 401 → GITHUB_REAUTH_REQUIRED', async () => {
    mockMerge.mockRejectedValue(ghError(401));

    await expect(mergePullRequest('t', 'o', 'r', 1)).rejects.toMatchObject({
      code: 'GITHUB_REAUTH_REQUIRED',
    });
  });

  it('mergePullRequest 405 → PR_NOT_MERGEABLE (override 유지)', async () => {
    mockMerge.mockRejectedValue(ghError(405));

    await expect(mergePullRequest('t', 'o', 'r', 1)).rejects.toMatchObject({
      code: 'PR_NOT_MERGEABLE',
    });
  });
});
