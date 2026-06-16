/*
 * rooms.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - Prisma(DB) 와 github.service(외부 API)를 가짜로 대체(mock)해서
 *     DB·네트워크 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   createRoom   : 룸 생성 (레포 중복 체크 → webhook 등록 → 트랜잭션으로 일괄 생성)
 *   getRooms     : 내가 속한 룸 목록
 *   getRoomById  : 특정 룸 상세 (멤버만 접근 가능)
 *   updateRoom   : 룸 정보 수정
 *   joinRoom     : 초대 코드로 룸 입장
 *   deleteRoom   : 룸 삭제 (webhook 해제 후 트랜잭션으로 일괄 삭제)
 *
 * ▷ prisma.$transaction 은 어떻게 mock 하나?
 *   서비스는 prisma.$transaction(async (tx) => { ... }) 형태로 호출합니다.
 *   테스트에선 "넘어온 콜백(cb)에 가짜 prisma(db)를 tx 로 그대로 넣어 실행"하도록
 *   mockImplementation 으로 흉내냅니다. → tx.room.create 등이 db.room.create 로 동작.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client/index.js';
import { prisma } from '@/lib/prisma.js';
import {
  registerWebhook,
  unregisterWebhook,
} from '@/services/github.service.js';
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  joinRoom,
  leaveRoom,
  updateRoom,
} from '@/services/rooms.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    room: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    repo: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    privateRoom: { createMany: vi.fn(), deleteMany: vi.fn() },
    privateRoomSession: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    todo: { deleteMany: vi.fn() },
    meeting: { deleteMany: vi.fn() },
    meetingParticipant: { deleteMany: vi.fn() },
    minutes: { deleteMany: vi.fn() },
    chatMessage: { deleteMany: vi.fn() },
    // 정원/멤버 판정 race 방지를 위한 룸 행 잠금(FOR UPDATE)에 쓰임
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

// webhook 등록/해제는 GitHub API 를 호출하므로 가짜로 대체
vi.mock('@/services/github.service.js', () => ({
  registerWebhook: vi.fn(),
  unregisterWebhook: vi.fn(),
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const USER_ID = 'user-1';
const ACCESS_TOKEN = 'gho_token';

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

describe('createRoom', () => {
  const input = {
    name: '두두 프로젝트',
    repo_full_name: 'jiyun/todak',
    max_members: 6,
  };

  it('이미 사용 중인 레포면 REPO_ALREADY_IN_USE', async () => {
    // 같은 fullName 의 repo 가 이미 존재 → 룸 생성 금지
    db.repo.findFirst.mockResolvedValue({ id: 'repo-1' });

    await expectAppError(
      createRoom(USER_ID, ACCESS_TOKEN, input),
      'REPO_ALREADY_IN_USE',
    );
    // 중복이면 webhook 등록까지 가면 안 됨
    expect(registerWebhook).not.toHaveBeenCalled();
  });

  it('정상 생성 시 webhook 등록 + 트랜잭션으로 room/repo/member/회의실 생성', async () => {
    db.repo.findFirst.mockResolvedValue(null); // 사용 중인 레포 없음
    vi.mocked(registerWebhook).mockResolvedValue('webhook-1');
    // createUniqueInviteCode 내부에서 호출하는 중복 체크 → 항상 없음(첫 코드 채택)
    db.room.findUnique.mockResolvedValue(null);
    db.room.create.mockResolvedValue({
      id: ROOM_ID,
      name: input.name,
      inviteCode: 'ABCD-1234',
    });
    db.repo.create.mockResolvedValue({});
    db.roomMember.create.mockResolvedValue({});
    db.privateRoom.createMany.mockResolvedValue({ count: 2 });

    const result = await createRoom(USER_ID, ACCESS_TOKEN, input);

    // owner/repo 로 쪼개 webhook 을 등록했는가
    expect(registerWebhook).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      'jiyun',
      'todak',
    );
    // 트랜잭션 안에서 핵심 레코드들을 생성했는가
    expect(db.room.create).toHaveBeenCalledOnce();
    expect(db.repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: ROOM_ID,
          fullName: 'jiyun/todak',
          webhookId: 'webhook-1',
        }),
      }),
    );
    expect(db.roomMember.create).toHaveBeenCalledOnce();
    // 룸 생성자는 방장(isHost: true)으로 지정돼야 함
    expect(db.roomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: ROOM_ID,
          userId: USER_ID,
          isHost: true,
        }),
      }),
    );
    // 룸당 회의실(프라이빗 룸) 2개를 자동 생성
    expect(db.privateRoom.createMany).toHaveBeenCalledWith({
      data: [
        { roomId: ROOM_ID, name: '회의실 A' },
        { roomId: ROOM_ID, name: '회의실 B' },
      ],
    });
    // 반환이 snake_case 형태로 잘 나오는가
    expect(result).toEqual({
      id: ROOM_ID,
      name: input.name,
      invite_code: 'ABCD-1234',
      repo_full_name: 'jiyun/todak',
      webhook_registered: true,
    });
  });

  it('findFirst 통과 후 동시 생성 race(P2002)는 REPO_ALREADY_IN_USE 로 변환하고 고아 webhook 을 정리', async () => {
    db.repo.findFirst.mockResolvedValue(null); // 체크 시점엔 비어 있음
    vi.mocked(registerWebhook).mockResolvedValue('webhook-1');
    db.room.findUnique.mockResolvedValue(null);
    db.room.create.mockResolvedValue({ id: ROOM_ID });
    // 다른 요청이 먼저 같은 레포로 룸을 만들어 repo.full_name unique 위반
    db.repo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    vi.mocked(unregisterWebhook).mockResolvedValue(undefined);

    await expectAppError(
      createRoom(USER_ID, ACCESS_TOKEN, input),
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

describe('getRooms', () => {
  it('내 멤버십 목록을 snake_case 로 매핑하고 character 설정 여부로 is_setup_completed 계산', async () => {
    db.roomMember.findMany.mockResolvedValue([
      {
        characterType: 'cat', // 설정 완료 → is_setup_completed: true
        room: {
          id: ROOM_ID,
          name: '두두',
          status: 'active',
          inviteCode: 'ABCD-1234',
          repos: [
            {
              id: 'repo-1',
              fullName: 'jiyun/todak',
              statsCachedAt: null,
              statsCache: null,
            },
          ],
          members: [
            { user: { githubUsername: 'jiyun-dev', avatarUrl: 'http://a/1' } },
          ],
        },
      },
    ]);

    const result = await getRooms(USER_ID);

    expect(result[0]).toMatchObject({
      id: ROOM_ID,
      name: '두두',
      is_setup_completed: true,
      repo: { id: 'repo-1', full_name: 'jiyun/todak' },
      member_count: 1,
    });
  });

  it('연결된 레포가 없으면 repo 는 null, characterType 이 null 이면 미설정', async () => {
    db.roomMember.findMany.mockResolvedValue([
      {
        characterType: null,
        room: {
          id: ROOM_ID,
          name: '두두',
          status: 'active',
          inviteCode: 'ABCD-1234',
          repos: [], // 연결 레포 없음
          members: [],
        },
      },
    ]);

    const result = await getRooms(USER_ID);

    expect(result[0].repo).toBeNull();
    expect(result[0].is_setup_completed).toBe(false);
  });
});

describe('getRoomById', () => {
  it('룸이 없으면 ROOM_NOT_FOUND', async () => {
    db.room.findUnique.mockResolvedValue(null);

    await expectAppError(getRoomById(USER_ID, ROOM_ID), 'ROOM_NOT_FOUND');
  });

  it('내가 멤버가 아니면 ROOM_NOT_FOUND (존재는 숨김)', async () => {
    // 룸은 있지만 members 에 내가 없음 → 존재 자체를 숨기려 동일 에러
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      members: [{ userId: 'someone-else' }],
      repos: [],
    });

    await expectAppError(getRoomById(USER_ID, ROOM_ID), 'ROOM_NOT_FOUND');
  });

  it('멤버면 setup 완료된 멤버만 추려 상세를 반환', async () => {
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      name: '두두',
      status: 'active',
      inviteCode: 'ABCD-1234',
      maxMembers: 6,
      createdAt: new Date('2026-05-18T14:02:00.000Z'),
      repos: [],
      members: [
        // 요청자(setup 완료)
        {
          userId: USER_ID,
          characterType: 'cat',
          roles: ['frontend'],
          detailedRole: null,
          nickname: '수정',
          status: 'focus',
          isHost: true,
          posX: 1,
          posY: 2,
          user: { id: USER_ID, githubUsername: 'jiyun-dev', avatarUrl: null },
        },
        // 아직 setup 안 한 멤버 → 응답 members 목록에서 제외돼야 함
        {
          userId: 'user-2',
          characterType: null,
          user: { id: 'user-2', githubUsername: 'noob', avatarUrl: null },
        },
      ],
    });

    const result = await getRoomById(USER_ID, ROOM_ID);

    // setup 완료된 1명만 노출
    expect(result.member_count).toBe(1);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      id: USER_ID,
      github_username: 'jiyun-dev',
      is_host: true,
    });
  });
});

describe('updateRoom', () => {
  it('멤버가 아니면 ROOM_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      updateRoom(USER_ID, ROOM_ID, { name: '새 이름' }),
      'ROOM_NOT_FOUND',
    );
  });

  it('방장이 아니면 FORBIDDEN', async () => {
    // 멤버이긴 하지만 방장(isHost)이 아님 → 수정 거부
    db.roomMember.findFirst.mockResolvedValue({
      isHost: false,
      room: { members: [{}] },
    });

    await expectAppError(
      updateRoom(USER_ID, ROOM_ID, { name: '새 이름' }),
      'FORBIDDEN',
    );
    expect(db.room.update).not.toHaveBeenCalled();
  });

  it('max_members 가 현재 인원보다 작으면 BAD_REQUEST', async () => {
    // 현재 3명인데 정원을 2로 줄이려 함 → 거부
    db.roomMember.findFirst.mockResolvedValue({
      isHost: true,
      room: { members: [{}, {}, {}] },
    });

    await expectAppError(
      updateRoom(USER_ID, ROOM_ID, { max_members: 2 }),
      'BAD_REQUEST',
    );
    expect(db.room.update).not.toHaveBeenCalled();
  });

  it('정상 수정 시 변경 필드만 update 하고 snake_case 로 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      isHost: true,
      room: { members: [{}] }, // 현재 1명
    });
    db.room.update.mockResolvedValue({
      id: ROOM_ID,
      name: '새 이름',
      maxMembers: 10,
    });

    const result = await updateRoom(USER_ID, ROOM_ID, {
      name: '새 이름',
      max_members: 10,
    });

    expect(db.room.update).toHaveBeenCalledWith({
      where: { id: ROOM_ID },
      data: { name: '새 이름', maxMembers: 10 },
    });
    expect(result).toEqual({ id: ROOM_ID, name: '새 이름', max_members: 10 });
  });
});

describe('joinRoom', () => {
  const input = { invite_code: 'ABCD-1234' };

  it('초대 코드가 유효하지 않으면 INVALID_INVITE_CODE', async () => {
    db.room.findUnique.mockResolvedValue(null);

    await expectAppError(joinRoom(USER_ID, input), 'INVALID_INVITE_CODE');
  });

  it('이미 가입한 룸이면 ALREADY_JOINED', async () => {
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      name: '두두',
      maxMembers: 6,
    });
    // 룸 행 잠금 후 멤버십 재조회 → 내가 이미 멤버
    db.roomMember.findUnique.mockResolvedValue({ id: 'rm-1' });

    await expectAppError(joinRoom(USER_ID, input), 'ALREADY_JOINED');
    // 이미 멤버면 정원 체크/생성까지 가면 안 됨
    expect(db.roomMember.create).not.toHaveBeenCalled();
  });

  it('정원이 가득 찼으면 ROOM_FULL', async () => {
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      name: '두두',
      maxMembers: 2,
    });
    db.roomMember.findUnique.mockResolvedValue(null); // 아직 멤버 아님
    db.roomMember.count.mockResolvedValue(2); // 이미 2/2

    await expectAppError(joinRoom(USER_ID, input), 'ROOM_FULL');
    expect(db.roomMember.create).not.toHaveBeenCalled();
  });

  it('정상 입장 시 roomMember 생성 후 room_id/name 반환', async () => {
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      name: '두두',
      maxMembers: 6,
    });
    db.roomMember.findUnique.mockResolvedValue(null);
    db.roomMember.count.mockResolvedValue(1);
    db.roomMember.create.mockResolvedValue({});

    const result = await joinRoom(USER_ID, input);

    expect(db.roomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomId: ROOM_ID, userId: USER_ID }),
      }),
    );
    expect(result).toEqual({ room_id: ROOM_ID, name: '두두' });
  });

  it('체크 통과 후 동시 입장 race(P2002)는 ALREADY_JOINED 로 변환', async () => {
    db.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      name: '두두',
      maxMembers: 6,
    });
    db.roomMember.findUnique.mockResolvedValue(null);
    db.roomMember.count.mockResolvedValue(1);
    // create 직전 다른 요청이 먼저 같은 (room, user) 를 만들어 unique 위반
    db.roomMember.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expectAppError(joinRoom(USER_ID, input), 'ALREADY_JOINED');
  });
});

describe('deleteRoom', () => {
  it('멤버가 아니면 ROOM_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      deleteRoom(USER_ID, ROOM_ID, ACCESS_TOKEN),
      'ROOM_NOT_FOUND',
    );
  });

  it('방장이 아니면 FORBIDDEN', async () => {
    // 멤버이긴 하지만 방장이 아님 → 삭제 거부
    db.roomMember.findFirst.mockResolvedValue({
      isHost: false,
      room: { repos: [{ fullName: 'jiyun/todak', webhookId: 'webhook-1' }] },
    });

    await expectAppError(
      deleteRoom(USER_ID, ROOM_ID, ACCESS_TOKEN),
      'FORBIDDEN',
    );
    // 권한이 없으면 webhook 해제·트랜잭션 삭제까지 가면 안 됨
    expect(unregisterWebhook).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('webhook 을 해제하고 트랜잭션으로 관련 레코드를 일괄 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      isHost: true,
      room: {
        repos: [{ fullName: 'jiyun/todak', webhookId: 'webhook-1' }],
      },
    });
    vi.mocked(unregisterWebhook).mockResolvedValue(undefined);

    await deleteRoom(USER_ID, ROOM_ID, ACCESS_TOKEN);

    // 등록된 webhook 을 해제했는가
    expect(unregisterWebhook).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      'jiyun',
      'todak',
      'webhook-1',
    );
    // 트랜잭션이 실행되어 룸 본체까지 삭제됐는가
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.room.delete).toHaveBeenCalledWith({ where: { id: ROOM_ID } });
  });

  it('webhook 해제가 실패해도 룸 삭제는 계속 진행', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      isHost: true,
      room: { repos: [{ fullName: 'jiyun/todak', webhookId: 'webhook-1' }] },
    });
    // webhook 해제 중 에러가 나도 삭제 흐름은 멈추지 않아야 함
    vi.mocked(unregisterWebhook).mockRejectedValue(new Error('GitHub 다운'));

    await deleteRoom(USER_ID, ROOM_ID, ACCESS_TOKEN);

    expect(db.room.delete).toHaveBeenCalledWith({ where: { id: ROOM_ID } });
  });
});

describe('leaveRoom', () => {
  it('멤버가 아니면 ROOM_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      leaveRoom(USER_ID, ROOM_ID, ACCESS_TOKEN),
      'ROOM_NOT_FOUND',
    );
  });

  it('마지막 멤버가 나가면 룸을 통째로 삭제(webhook 해제 + 전체 삭제)', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      id: 'rm-1',
      userId: USER_ID,
      isHost: true,
      room: {
        repos: [{ fullName: 'jiyun/todak', webhookId: 'webhook-1' }],
      },
    });
    // 룸 행 잠금 후 tx 안에서 멤버 재조회 → 나 혼자
    db.roomMember.findMany.mockResolvedValue([
      { id: 'rm-1', userId: USER_ID, isHost: true },
    ]);
    vi.mocked(unregisterWebhook).mockResolvedValue(undefined);

    const result = await leaveRoom(USER_ID, ROOM_ID, ACCESS_TOKEN);

    expect(unregisterWebhook).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      'jiyun',
      'todak',
      'webhook-1',
    );
    expect(db.room.delete).toHaveBeenCalledWith({ where: { id: ROOM_ID } });
    // 마지막 멤버 → 내 멤버십만 콕 집어 지우지 않고 deleteMany 로 일괄 삭제
    expect(db.roomMember.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      left: true,
      room_deleted: true,
      new_host_user_id: null,
    });
  });

  it('방장이 나가면 다음으로 가입한 멤버에게 방장을 위임하고 내 멤버십만 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      id: 'rm-1',
      userId: USER_ID,
      isHost: true,
      room: { repos: [] },
    });
    // joinedAt 오름차순 — 방장(나) 다음이 user-2
    db.roomMember.findMany.mockResolvedValue([
      { id: 'rm-1', userId: USER_ID, isHost: true },
      { id: 'rm-2', userId: 'user-2', isHost: false },
      { id: 'rm-3', userId: 'user-3', isHost: false },
    ]);

    const result = await leaveRoom(USER_ID, ROOM_ID, ACCESS_TOKEN);

    // 다음 가입자(rm-2)가 새 방장
    expect(db.roomMember.update).toHaveBeenCalledWith({
      where: { id: 'rm-2' },
      data: { isHost: true },
    });
    // 내 멤버십만 삭제, 룸은 유지
    expect(db.roomMember.delete).toHaveBeenCalledWith({
      where: { id: 'rm-1' },
    });
    expect(db.room.delete).not.toHaveBeenCalled();
    expect(unregisterWebhook).not.toHaveBeenCalled();
    expect(result).toEqual({
      left: true,
      room_deleted: false,
      new_host_user_id: 'user-2',
    });
  });

  it('방장이 아닌 멤버가 나가면 위임 없이 내 멤버십만 삭제', async () => {
    db.roomMember.findFirst.mockResolvedValue({
      id: 'rm-2',
      userId: USER_ID,
      isHost: false,
      room: { repos: [] },
    });
    db.roomMember.findMany.mockResolvedValue([
      { id: 'rm-1', userId: 'host-user', isHost: true },
      { id: 'rm-2', userId: USER_ID, isHost: false },
    ]);

    const result = await leaveRoom(USER_ID, ROOM_ID, ACCESS_TOKEN);

    expect(db.roomMember.update).not.toHaveBeenCalled();
    expect(db.roomMember.delete).toHaveBeenCalledWith({
      where: { id: 'rm-2' },
    });
    expect(db.room.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      left: true,
      room_deleted: false,
      new_host_user_id: null,
    });
  });
});
