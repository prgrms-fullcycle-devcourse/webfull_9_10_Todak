/*
 * buildMeetingInfoHeader 순수 함수 유닛 테스트
 * - 회의 메타데이터(일시/진행자/참석자)를 DB 사실로 렌더하는지 검증
 * - KST 포맷, 참석자 없음 처리 포함
 */
import { describe, expect, it } from 'vitest';

import { buildMeetingInfoHeader } from '@/jobs/workers/minutes-header.js';

describe('buildMeetingInfoHeader', () => {
  // 2026-06-14T14:34:00Z = KST 2026-06-14 23:34 (일)
  const startedAt = new Date('2026-06-14T14:34:00.000Z');

  it('진행자·일시·참석자를 헤더로 렌더한다 (일시는 KST)', () => {
    const header = buildMeetingInfoHeader(startedAt, '권수정', [
      '권수정',
      '민호',
      '수아',
    ]);

    expect(header).toContain('## 📅 회의 정보');
    expect(header).toContain('**진행자:** 권수정');
    expect(header).toContain('**참석자:** 권수정, 민호, 수아');
    // KST 기준 23:34, 날짜/요일 포함
    expect(header).toContain('23:34 KST');
    expect(header).toContain('2026년 6월 14일');
    // 본문과 구분되는 구분선으로 끝난다
    expect(header.trimEnd().endsWith('---')).toBe(true);
  });

  it('참석자가 없으면 "기록 없음" 으로 표시', () => {
    const header = buildMeetingInfoHeader(startedAt, '권수정', []);
    expect(header).toContain('**참석자:** 기록 없음');
  });
});
