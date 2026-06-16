/*
 * repos.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - Prisma(DB) 와 github.service(외부 API)를 가짜로 대체(mock)해서
 *     DB·네트워크 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   createGithubRepo : 입력을 github.createRepo 로 위임(레포 생성)
 *   deleteGithubRepo : 레포 존재·멤버십·토큰 검증 후 GitHub 삭제 + DB 삭제
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';
import {
  createRepo,
  deleteRepo,
  registerWebhook,
  unregisterWebhook,
} from '@/services/github.service.js';
import {
  connectRepo,
  createGithubRepo,
  deleteGithubRepo,
} from '@/services/repos.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    repo: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    roomMember: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// GitHub API 호출을 가짜로 대체
vi.mock('@/services/github.service.js', () => ({
  createRepo: vi.fn(),
  deleteRepo: vi.fn(),
  registerWebhook: vi.fn(),
  unregisterWebhook: vi.fn(),
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const USER_ID = 'user-1';
const REPO_ID = 'repo-1';
const ROOM_ID = 'room-1';

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction(cb) → cb(db) 로 실행: 콜백 안의 tx 를 가짜 prisma(db)로 대체
  db.$transaction.mockImplementation(async (cb: (tx: typeof db) => unknown) =>
    cb(db),
  );
});

describe('createGithubRepo', () => {
  it('입력 값을 github.createRepo 로 그대로 위임한다', async () => {
    const created = {
      full_name: 'jiyun/new-repo',
      html_url: 'http://gh/new-repo',
      private: true,
      default_branch: 'main',
    };
    vi.mocked(createRepo).mockResolvedValue(created);

    const result = await createGithubRepo('gho_token', {
      name: 'new-repo',
      private: true,
      auto_init: true,
      org: 'todak-org',
    });

    // 토큰 + 입력 필드 순서대로 위임됐는가
    expect(createRepo).toHaveBeenCalledWith(
      'gho_token',
      'new-repo',
      true,
      'todak-org',
      true,
    );
    expect(result).toEqual(created);
  });
});

describe('deleteGithubRepo', () => {
  it('레포가 없으면 REPO_NOT_FOUND', async () => {
    db.repo.findUnique.mockResolvedValue(null);

    await expectAppError(deleteGithubRepo(USER_ID, REPO_ID), 'REPO_NOT_FOUND');
  });

  it('해당 룸의 멤버가 아니면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.repo.findUnique.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue(null); // 멤버 아님

    await expectAppError(
      deleteGithubRepo(USER_ID, REPO_ID),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('방장이 아니면 FORBIDDEN', async () => {
    db.repo.findUnique.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    // 멤버이긴 하지만 방장이 아님 → 레포 삭제 거부
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1', isHost: false });

    await expectAppError(deleteGithubRepo(USER_ID, REPO_ID), 'FORBIDDEN');
    // 권한이 없으면 GitHub 삭제까지 가면 안 됨
    expect(deleteRepo).not.toHaveBeenCalled();
  });

  it('유저의 GitHub 토큰이 없으면 GITHUB_SCOPE_REQUIRED', async () => {
    db.repo.findUnique.mockResolvedValue({ id: REPO_ID, roomId: ROOM_ID });
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1', isHost: true });
    db.user.findUnique.mockResolvedValue({ accessToken: null }); // 토큰 미동의

    await expectAppError(
      deleteGithubRepo(USER_ID, REPO_ID),
      'GITHUB_SCOPE_REQUIRED',
    );
    // 토큰이 없으면 GitHub 삭제까지 가면 안 됨
    expect(deleteRepo).not.toHaveBeenCalled();
  });

  it('정상이면 GitHub 레포를 삭제하고 DB 에서도 삭제한 뒤 roomId 반환', async () => {
    db.repo.findUnique.mockResolvedValue({
      id: REPO_ID,
      roomId: ROOM_ID,
      fullName: 'jiyun/todak',
    });
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1', isHost: true });
    db.user.findUnique.mockResolvedValue({ accessToken: 'gho_token' });
    vi.mocked(deleteRepo).mockResolvedValue(undefined);
    db.repo.delete.mockResolvedValue({});

    const result = await deleteGithubRepo(USER_ID, REPO_ID);

    // fullName 을 owner/repo 로 쪼개 GitHub 삭제를 호출했는가
    expect(deleteRepo).toHaveBeenCalledWith('gho_token', 'jiyun', 'todak');
    // DB 레코드도 삭제했는가
    expect(db.repo.delete).toHaveBeenCalledWith({ where: { id: REPO_ID } });
    expect(result).toEqual({ roomId: ROOM_ID });
  });
});

describe('connectRepo', () => {
  const ACCESS_TOKEN = 'gho_token';
  const FULL_NAME = 'jiyun/todak';

  it('다른 룸이 이미 같은 레포를 쓰면 REPO_ALREADY_IN_USE (webhook 등록 전 차단)', async () => {
    db.roomMember.findFirst.mockResolvedValue({ isHost: true }); // assertRoomHost
    db.repo.findFirst.mockResolvedValueOnce({ id: 'other-repo' }); // usedByOther

    await expectAppError(
      connectRepo(USER_ID, ROOM_ID, ACCESS_TOKEN, FULL_NAME),
      'REPO_ALREADY_IN_USE',
    );
    // 사전 차단이므로 webhook 등록까지 가면 안 됨
    expect(registerWebhook).not.toHaveBeenCalled();
  });

  it('신규 연결 시 webhook 등록 + repo.create 후 결과 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ isHost: true });
    db.repo.findFirst
      .mockResolvedValueOnce(null) // usedByOther 없음
      .mockResolvedValueOnce(null); // 룸에 기존 repo 없음(신규)
    vi.mocked(registerWebhook).mockResolvedValue('webhook-1');
    db.repo.create.mockResolvedValue({ id: REPO_ID, fullName: FULL_NAME });

    const result = await connectRepo(USER_ID, ROOM_ID, ACCESS_TOKEN, FULL_NAME);

    expect(registerWebhook).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      'jiyun',
      'todak',
    );
    expect(db.repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: ROOM_ID,
          fullName: FULL_NAME,
          webhookId: 'webhook-1',
        }),
      }),
    );
    expect(result).toMatchObject({
      repo_id: REPO_ID,
      room_id: ROOM_ID,
      repo_full_name: FULL_NAME,
      webhook_registered: true,
    });
  });

  it('usedByOther 통과 후 동시 연결 race(P2002)는 REPO_ALREADY_IN_USE 로 변환하고 고아 webhook 정리', async () => {
    db.roomMember.findFirst.mockResolvedValue({ isHost: true });
    db.repo.findFirst
      .mockResolvedValueOnce(null) // usedByOther: 체크 시점엔 비어 있음
      .mockResolvedValueOnce(null); // 신규 연결
    vi.mocked(registerWebhook).mockResolvedValue('webhook-1');
    // create 직전 다른 룸이 먼저 같은 레포를 연결 → full_name unique 위반
    db.repo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    vi.mocked(unregisterWebhook).mockResolvedValue(undefined);

    await expectAppError(
      connectRepo(USER_ID, ROOM_ID, ACCESS_TOKEN, FULL_NAME),
      'REPO_ALREADY_IN_USE',
    );
    // 방금 등록한 중복 webhook 은 정리돼야 함
    expect(unregisterWebhook).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      'jiyun',
      'todak',
      'webhook-1',
    );
  });
});
