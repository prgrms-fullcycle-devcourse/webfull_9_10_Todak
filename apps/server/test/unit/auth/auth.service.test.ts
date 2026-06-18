/*
 * auth.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - 외부 의존성(Prisma=DB, Redis, GitHub API=fetch)을 가짜로 대체(mock)해서
 *     실제 연결 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   exchangeCodeForToken : GitHub OAuth code → access_token 교환 (fetch 사용)
 *   getGithubUser        : access_token 으로 GitHub 유저 정보 조회 (fetch 사용)
 *   upsertUser           : GitHub 유저를 DB에 upsert(없으면 생성, 있으면 갱신)
 *   sign/verify (JWT)    : Access/Refresh 토큰 발급·검증 (실제 jwt 라이브러리 사용)
 *   *RefreshToken (Redis): Refresh 토큰 Redis 저장/조회/삭제
 *
 * ▷ JWT 는 왜 mock 안 하나?
 *   jwt 는 순수 계산(서명/검증)이라 DB·네트워크가 필요 없습니다.
 *   그래서 "발급한 토큰을 그대로 검증하면 원래 payload 가 나오는가"처럼
 *   실제 라이브러리로 라운드트립(왕복)을 확인하는 게 더 의미 있습니다.
 *   (env.JWT_SECRET 은 실제 .env 값을 그대로 사용)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  deleteRefreshToken,
  exchangeCodeForToken,
  getGithubUser,
  getRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  saveRefreshToken,
  signAccessToken,
  signRefreshToken,
  upsertUser,
  verifyJwt,
  verifyRefreshToken,
  type JwtPayload,
} from '@/services/auth/auth.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 user.upsert 만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    user: { upsert: vi.fn() },
  },
}));

// redis 도 가짜로 대체 — import 시점에 실제 커넥션이 안 생기도록 + 호출만 관찰
vi.mock('@/lib/redis.js', () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = redis as any;

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

// 매 테스트 전에 가짜 함수들의 호출기록/주입값 초기화 (테스트 간 간섭 방지)
beforeEach(() => {
  vi.clearAllMocks();
});

describe('exchangeCodeForToken', () => {
  it('GitHub 응답이 실패(res.ok=false)면 GITHUB_API_ERROR', async () => {
    // Arrange: fetch 가 ok=false 응답을 돌려주도록 가짜로 대체
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: vi.fn() }),
    );

    // Act + Assert
    await expectAppError(exchangeCodeForToken('code-1'), 'GITHUB_API_ERROR');
  });

  it('응답 본문에 access_token 이 없으면 GITHUB_API_ERROR', async () => {
    // ok 는 true 지만 body 에 토큰이 없음(권한 거부 등) → 에러로 처리
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ error: 'bad_verification_code' }),
      }),
    );

    await expectAppError(exchangeCodeForToken('code-1'), 'GITHUB_API_ERROR');
  });

  it('정상 응답이면 access_token 문자열을 반환', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'gho_abc123' }),
      }),
    );

    const token = await exchangeCodeForToken('code-1');

    expect(token).toBe('gho_abc123');
  });
});

describe('getGithubUser', () => {
  it('GitHub 응답이 실패면 GITHUB_API_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: vi.fn() }),
    );

    await expectAppError(getGithubUser('gho_abc123'), 'GITHUB_API_ERROR');
  });

  it('정상이면 GitHub 유저 객체를 반환하고 Authorization 헤더를 붙인다', async () => {
    const githubUser = { id: 1, login: 'jiyun-dev', avatar_url: 'http://a/1' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(githubUser),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getGithubUser('gho_abc123');

    expect(result).toEqual(githubUser);
    // 토큰을 Bearer 헤더로 실어 보냈는지 확인
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_abc123',
        }),
      }),
    );
  });
});

describe('upsertUser', () => {
  it('githubId 를 키로 user.upsert 를 올바른 create/update 인자로 호출', async () => {
    db.user.upsert.mockResolvedValue({ id: 'user-1' });
    const githubUser = { id: 42, login: 'jiyun-dev', avatar_url: 'http://a/1' };

    await upsertUser(githubUser, 'gho_token');

    expect(db.user.upsert).toHaveBeenCalledWith({
      // githubId 는 문자열로 변환되어 where 에 들어가야 함
      where: { githubId: '42' },
      update: {
        githubUsername: 'jiyun-dev',
        avatarUrl: 'http://a/1',
        accessToken: 'gho_token',
      },
      create: {
        githubId: '42',
        githubUsername: 'jiyun-dev',
        avatarUrl: 'http://a/1',
        accessToken: 'gho_token',
      },
    });
  });
});

describe('Access Token (signAccessToken / verifyJwt)', () => {
  const payload: JwtPayload = {
    id: 'user-1',
    githubId: 42,
    login: 'jiyun-dev',
    avatarUrl: 'http://a/1',
    githubAccessToken: 'gho_token',
  };

  it('발급한 Access Token 을 검증하면 원래 payload 가 그대로 나온다 (라운드트립)', () => {
    const token = signAccessToken(payload);

    const decoded = verifyJwt(token);

    // verify 결과에는 iat/exp/type 등이 추가되므로, payload 키들만 부분 비교
    expect(decoded).toMatchObject(payload);
  });

  it('위조/깨진 토큰이면 INVALID_TOKEN', () => {
    expect(() => verifyJwt('not-a-real-token')).toThrow(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });

  it('Refresh Token 을 Access 로 검증하면 type 불일치로 INVALID_TOKEN', () => {
    // refresh 토큰은 type:'refresh' → access 검증기(verifyJwt)는 거부해야 함
    const refreshToken = signRefreshToken('user-1');

    expect(() => verifyJwt(refreshToken)).toThrow(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });
});

describe('Refresh Token (signRefreshToken / verifyRefreshToken)', () => {
  it('발급한 Refresh Token 을 검증하면 userId 가 나온다 (라운드트립)', () => {
    const token = signRefreshToken('user-1');

    const decoded = verifyRefreshToken(token);

    expect(decoded.id).toBe('user-1');
  });

  it('Access Token 을 Refresh 로 검증하면 type 불일치로 INVALID_TOKEN', () => {
    const accessToken = signAccessToken({
      id: 'user-1',
      githubId: 42,
      login: 'jiyun-dev',
      avatarUrl: 'http://a/1',
      githubAccessToken: 'gho_token',
    });

    expect(() => verifyRefreshToken(accessToken)).toThrow(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });
});

describe('Refresh Token 저장소 (Redis)', () => {
  it('saveRefreshToken 은 refresh:<userId> 키에 TTL 과 함께 저장', async () => {
    cache.set.mockResolvedValue('OK');

    await saveRefreshToken('user-1', 'token-1');

    expect(cache.set).toHaveBeenCalledWith(
      'refresh:user-1',
      'token-1',
      'EX',
      REFRESH_TOKEN_TTL_SECONDS,
    );
  });

  it('getRefreshToken 은 저장된 토큰을 그대로 반환', async () => {
    cache.get.mockResolvedValue('token-1');

    const result = await getRefreshToken('user-1');

    expect(cache.get).toHaveBeenCalledWith('refresh:user-1');
    expect(result).toBe('token-1');
  });

  it('deleteRefreshToken 은 해당 키를 삭제', async () => {
    cache.del.mockResolvedValue(1);

    await deleteRefreshToken('user-1');

    expect(cache.del).toHaveBeenCalledWith('refresh:user-1');
  });
});

describe('토큰 TTL 상수', () => {
  it('Access 1시간 / Refresh 7일', () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(60 * 60);
    expect(REFRESH_TOKEN_TTL_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});
