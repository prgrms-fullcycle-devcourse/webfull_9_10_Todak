/*
 * anthropic.service 의 resolveActionItemAssignees 유닛 테스트 (순수 함수)
 * - AI 가 지목한 assignee_github_username 을 룸 멤버 User 로 매핑하는 로직 검증
 */
import { describe, expect, it } from 'vitest';

import { resolveActionItemAssignees } from '@/services/ai/anthropic.service.js';

const members = [
  { id: 'u-1', githubUsername: 'kim', avatarUrl: 'https://avatar/1' },
  { id: 'u-2', githubUsername: 'lee', avatarUrl: null },
];

describe('resolveActionItemAssignees', () => {
  it('지목된 담당자가 룸 멤버면 assignee 객체로 매핑', () => {
    const result = resolveActionItemAssignees(
      [
        {
          title: '로그인 구현',
          body: '본문',
          labels: ['backend'],
          assigneeGithubUsername: 'kim',
        },
      ],
      members,
    );

    expect(result[0]).toEqual({
      title: '로그인 구현',
      body: '본문',
      labels: ['backend'],
      assignee: {
        id: 'u-1',
        github_username: 'kim',
        avatar_url: 'https://avatar/1',
      },
    });
  });

  it('지목된 담당자가 룸 멤버가 아니면 assignee=null', () => {
    const result = resolveActionItemAssignees(
      [{ title: 't', labels: [], assigneeGithubUsername: 'outsider' }],
      members,
    );
    expect(result[0].assignee).toBeNull();
  });

  it('담당자 미지목이면 assignee=null', () => {
    const result = resolveActionItemAssignees(
      [{ title: 't', labels: [] }],
      members,
    );
    expect(result[0].assignee).toBeNull();
  });

  it('title/body/labels 는 그대로 보존', () => {
    const result = resolveActionItemAssignees(
      [{ title: '제목', body: '설명', labels: ['x', 'y'] }],
      members,
    );
    expect(result[0]).toMatchObject({
      title: '제목',
      body: '설명',
      labels: ['x', 'y'],
    });
  });
});
