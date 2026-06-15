/*
 * classifyMinutesFailReason — 회의록 생성 실패 에러 → 클라 전달 사유 코드 분류
 */
import { UnrecoverableError } from 'bullmq';
import { describe, expect, it } from 'vitest';

import { classifyMinutesFailReason } from '@/jobs/workers/minutes-fail-reason.js';

describe('classifyMinutesFailReason', () => {
  it('대화 없음(UnrecoverableError) → MINUTES_NO_CHAT_LOG', () => {
    expect(
      classifyMinutesFailReason(new UnrecoverableError('MINUTES_NO_CHAT_LOG')),
    ).toBe('MINUTES_NO_CHAT_LOG');
  });

  it('회의 없음(UnrecoverableError) → MEETING_NOT_FOUND', () => {
    expect(
      classifyMinutesFailReason(new UnrecoverableError('MEETING_NOT_FOUND')),
    ).toBe('MEETING_NOT_FOUND');
  });

  it('일시적 오류(일반 Error) → GENERATION_ERROR', () => {
    expect(classifyMinutesFailReason(new Error('socket hang up'))).toBe(
      'GENERATION_ERROR',
    );
  });

  it('UnrecoverableError 라도 알 수 없는 메시지면 GENERATION_ERROR (내부 메시지 비노출)', () => {
    expect(
      classifyMinutesFailReason(new UnrecoverableError('SOME_INTERNAL_DETAIL')),
    ).toBe('GENERATION_ERROR');
  });
});
