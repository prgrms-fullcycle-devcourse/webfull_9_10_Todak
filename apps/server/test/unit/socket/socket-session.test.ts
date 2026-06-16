import { beforeEach, describe, expect, it } from 'vitest';

import {
  claimActiveSession,
  clearAllActiveSessions,
  releaseActiveSession,
} from '@/socket/socket-session.js';

describe('socket-session', () => {
  beforeEach(() => {
    clearAllActiveSessions();
  });

  it('첫 연결은 교체 대상이 없다', () => {
    expect(claimActiveSession('user-1', 'socket-a')).toBeNull();
  });

  it('같은 userId의 새 소켓이 이전 소켓 id를 반환한다', () => {
    claimActiveSession('user-1', 'socket-a');

    expect(claimActiveSession('user-1', 'socket-b')).toBe('socket-a');
  });

  it('활성 소켓 disconnect만 후처리 대상이다', () => {
    claimActiveSession('user-1', 'socket-a');
    claimActiveSession('user-1', 'socket-b');

    expect(releaseActiveSession('user-1', 'socket-a')).toBe(false);
    expect(releaseActiveSession('user-1', 'socket-b')).toBe(true);
    expect(releaseActiveSession('user-1', 'socket-b')).toBe(false);
  });

  it('clearAllActiveSessions는 등록을 모두 비운다', () => {
    claimActiveSession('user-1', 'socket-a');

    clearAllActiveSessions();

    expect(releaseActiveSession('user-1', 'socket-a')).toBe(false);
  });
});
