/*
 * minutes-header(회의 정보 헤더) 순수 함수 테스트
 * - buildMeetingInfoHeader: 진행자·일시(KST)·참석자 렌더
 * - splitMeetingInfoHeader: 헤더/본문 분리 (다듬기 시 헤더 보존용)
 */
import { describe, expect, it } from 'vitest';

import {
  buildDisplayNameMap,
  buildMeetingInfoHeader,
  splitMeetingInfoHeader,
} from '@/jobs/workers/minutes-header.js';

// 2026-06-14T14:34:00Z = KST 2026-06-14 23:34 (일)
const startedAt = new Date('2026-06-14T14:34:00.000Z');

describe('buildMeetingInfoHeader', () => {
  it('진행자·일시(KST)·참석자를 헤더로 렌더하고 구분선으로 끝난다', () => {
    const header = buildMeetingInfoHeader(startedAt, '권수정', [
      '권수정',
      '민호',
    ]);

    expect(header).toContain('## 📅 회의 정보');
    expect(header).toContain('**진행자:** 권수정');
    expect(header).toContain('**참석자:** 권수정, 민호');
    expect(header).toContain('23:34 KST');
    expect(header.trimEnd().endsWith('---')).toBe(true);
  });

  it('참석자가 없으면 "기록 없음"', () => {
    expect(buildMeetingInfoHeader(startedAt, '권수정', [])).toContain(
      '**참석자:** 기록 없음',
    );
  });
});

describe('splitMeetingInfoHeader', () => {
  it('헤더가 있으면 헤더와 본문을 분리한다 (round-trip)', () => {
    const header = buildMeetingInfoHeader(startedAt, '권수정', ['권수정']);
    const body = '## 논의 사항\n소켓 연동을 논의했다.';
    const contentMd = `${header}\n\n${body}`;

    const result = splitMeetingInfoHeader(contentMd);
    expect(result.header).toBe(header);
    expect(result.body).toBe(body);
  });

  it('본문에 "---"(수평선)가 또 있어도 헤더의 첫 구분선에서만 자른다', () => {
    const header = buildMeetingInfoHeader(startedAt, '권수정', ['권수정']);
    const body = '## 논의\n첫째\n\n---\n\n둘째';
    const result = splitMeetingInfoHeader(`${header}\n\n${body}`);

    expect(result.header).toBe(header);
    expect(result.body).toBe(body);
  });

  it('헤더가 없으면(수동 회의록) header=null, body=원본 전체', () => {
    const contentMd = '# 자유 양식 회의록\n내용만 있음';
    const result = splitMeetingInfoHeader(contentMd);

    expect(result.header).toBeNull();
    expect(result.body).toBe(contentMd);
  });
});

describe('buildDisplayNameMap', () => {
  it('닉네임이 고유하면 닉네임만 사용한다', () => {
    const map = buildDisplayNameMap([
      { id: 'u1', nickname: '수정', githubUsername: 'sujeong' },
      { id: 'u2', nickname: '민호', githubUsername: 'minho' },
    ]);
    expect(map.get('u1')).toBe('수정');
    expect(map.get('u2')).toBe('민호');
  });

  it('닉네임이 중복되면 githubUsername 을 병기한다', () => {
    const map = buildDisplayNameMap([
      { id: 'u1', nickname: '수정', githubUsername: 'sujeong-a' },
      { id: 'u2', nickname: '수정', githubUsername: 'sujeong-b' },
      { id: 'u3', nickname: '민호', githubUsername: 'minho' },
    ]);
    expect(map.get('u1')).toBe('수정 (sujeong-a)');
    expect(map.get('u2')).toBe('수정 (sujeong-b)');
    // 중복 아닌 멤버는 그대로
    expect(map.get('u3')).toBe('민호');
  });

  it('닉네임이 없으면 githubUsername 을 쓰고 중복 병기는 하지 않는다', () => {
    const map = buildDisplayNameMap([
      { id: 'u1', nickname: null, githubUsername: 'octocat' },
      { id: 'u2', nickname: '', githubUsername: 'hubot' },
    ]);
    expect(map.get('u1')).toBe('octocat');
    expect(map.get('u2')).toBe('hubot');
  });
});
