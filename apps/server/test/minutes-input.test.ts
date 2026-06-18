/*
 * minutes-input(채팅 로그 정제·압축) 순수 함수 테스트
 * - filterChatNoise: 빈 내용·이모지/기호만 제거, 텍스트는 짧아도 보존
 * - formatChatLog: 예산 이하는 그대로, 초과 시 앞+뒤 보존 + 중략 마커
 */
import { describe, expect, it } from 'vitest';

import {
  filterChatNoise,
  formatChatLog,
} from '@/services/rooms/minutes/minutes-input.js';

const at = new Date('2026-06-14T00:00:00.000Z');
const msg = (content: string | null, username = 'alice') => ({
  createdAt: at,
  content,
  user: { githubUsername: username },
});

describe('filterChatNoise', () => {
  it('빈 내용·공백·이모지/기호만인 메시지를 제거한다', () => {
    const input = [
      msg('소켓 연동 방식을 논의했다'),
      msg(''), // 빈 내용
      msg('   '), // 공백
      msg('😀😀'), // 이모지만
      msg('!!!'), // 기호만
      msg(null), // null
    ];

    const result = filterChatNoise(input);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('소켓 연동 방식을 논의했다');
  });

  it('짧은 텍스트("응")는 의미가 있어 보존한다', () => {
    const result = filterChatNoise([msg('응'), msg('ㅇㅋ')]);
    expect(result).toHaveLength(2);
  });
});

describe('formatChatLog', () => {
  it('예산 이하면 전체를 줄바꿈으로 이어 붙인다', () => {
    const log = formatChatLog([msg('첫 메시지'), msg('둘째 메시지', 'bob')]);
    expect(log).toContain('alice: 첫 메시지');
    expect(log).toContain('bob: 둘째 메시지');
    expect(log).not.toContain('중략');
  });

  it('예산 초과 시 앞+뒤를 보존하고 중간을 중략 마커로 압축한다', () => {
    // 각 메시지를 충분히 길게 만들어 40k 문자 예산을 넘긴다
    const big = 'x'.repeat(500);
    const many = Array.from({ length: 200 }, (_, i) => msg(`${big}-${i}`));

    const log = formatChatLog(many);

    // 중략 마커 존재 + 앞(0번)과 뒤(199번) 보존
    expect(log).toContain('중략: 메시지');
    expect(log).toContain('-0');
    expect(log).toContain('-199');
    // 전체를 다 담지 않아 원본보다 짧다
    expect(log.length).toBeLessThan(many.length * (big.length + 40));
  });
});
