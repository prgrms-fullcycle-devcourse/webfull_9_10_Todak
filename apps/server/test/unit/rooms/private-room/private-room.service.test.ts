/*
 * private-room.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 의 상단 주석과 동일합니다.
 *   - Prisma(DB)를 가짜로 대체(mock)해서 DB 없이 로직만 검증
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *   - mockResolvedValue(x): "이 prisma 메서드가 호출되면 x 를 돌려줘라"
 *
 * 여기서 테스트하는 함수:
 *   getPrivateRooms  : 룸의 프라이빗 룸 목록 + 회의중 여부 + 참여자
 *   enterPrivateRoom : 프라이빗 룸 입장
 *   leavePrivateRoom : 프라이빗 룸 퇴장 (마지막 사람이 나가면 회의 취소)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import {
  clearActivePrivateRoomSessions,
  enterPrivateRoom,
  getPrivateRooms,
  getPrivateRoomsForUser,
  leavePrivateRoom,
} from '@/services/rooms/private-room/private-room.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 메서드만 vi.fn()(가짜 함수)으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    roomMember: { findFirst: vi.fn() },
    privateRoom: { findUnique: vi.fn(), findMany: vi.fn() },
    privateRoomSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    meeting: { updateMany: vi.fn() },
  },
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const PRIVATE_ROOM_ID = 'pr-1';
const USER_ID = 'user-1';

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

// "이 유저가 룸 멤버다"라는 가정을 세팅하는 헬퍼 (assertRoomMember 통과용)
function asMember() {
  db.roomMember.findFirst.mockResolvedValue({ id: 'member-1' });
}

// 매 테스트 전에 가짜 함수들의 호출기록/주입값 초기화 (테스트 간 간섭 방지)
// 기본은 "멤버"로 두고, 비멤버 케이스만 개별 테스트에서 null 로 덮어쓴다.
beforeEach(() => {
  vi.clearAllMocks();
  asMember();
});

describe('getPrivateRooms', () => {
  it('룸이 없으면 NOT_FOUND', async () => {
    // 룸 조회가 null → 존재하지 않는 룸
    db.room.findUnique.mockResolvedValue(null);

    await expectAppError(getPrivateRooms(ROOM_ID), 'NOT_FOUND');
  });

  it('ongoing 회의 유무로 is_meeting_active를 계산하고 참여자를 매핑', async () => {
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID }); // 룸 존재
    /*
     * 프라이빗 룸 2개를 가짜로 돌려준다.
     * is_meeting_active 는 DB 컬럼이 아니라, "ongoing 회의(meetings)가 있는지"로
     * 서비스가 계산하는 값이다. 그래서:
     *   pr-a: meetings 에 항목 있음 → is_meeting_active: true
     *   pr-b: meetings 빈 배열      → is_meeting_active: false
     */
    db.privateRoom.findMany.mockResolvedValue([
      {
        id: 'pr-a',
        name: '회의실 A',
        meetings: [{ id: 'm-1' }], // 진행 중 회의 있음
        sessions: [
          {
            // DB row 는 camelCase. 서비스가 snake_case 로 바꿔주는지도 함께 확인
            userId: USER_ID,
            enteredAt: new Date('2026-05-18T14:02:00.000Z'),
            user: { id: USER_ID, githubUsername: 'jiyun-dev' },
          },
        ],
      },
      {
        id: 'pr-b',
        name: '회의실 B',
        meetings: [], // 진행 중 회의 없음
        sessions: [], // 입장자 없음
      },
    ]);

    const result = await getPrivateRooms(ROOM_ID);

    // 첫 번째 방: 회의중 true + 참여자 1명이 snake_case 로 매핑됐는지
    expect(result[0]).toEqual({
      id: 'pr-a',
      name: '회의실 A',
      is_meeting_active: true,
      current_participants: [
        {
          user_id: USER_ID,
          github_username: 'jiyun-dev',
          entered_at: '2026-05-18T14:02:00.000Z',
        },
      ],
    });
    // 두 번째 방: 회의 없음 → false, 참여자 빈 배열
    expect(result[1].is_meeting_active).toBe(false);
    expect(result[1].current_participants).toEqual([]);
  });
});

describe('getPrivateRoomsForUser', () => {
  it('룸 멤버가 아니면 ROOM_NOT_FOUND (타 룸 명단 열람 차단)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null); // 비멤버

    await expectAppError(
      getPrivateRoomsForUser(ROOM_ID, USER_ID),
      'ROOM_NOT_FOUND',
    );
    // 멤버십에서 막혔으므로 실제 프라이빗 룸 조회까지 가지 않는다
    expect(db.privateRoom.findMany).not.toHaveBeenCalled();
  });

  it('룸 멤버면 프라이빗 룸 목록을 반환', async () => {
    db.room.findUnique.mockResolvedValue({ id: ROOM_ID });
    db.privateRoom.findMany.mockResolvedValue([]);

    const result = await getPrivateRoomsForUser(ROOM_ID, USER_ID);

    expect(result).toEqual([]);
  });
});

describe('enterPrivateRoom', () => {
  it('룸 멤버가 아니면 ROOM_NOT_FOUND (비멤버 입장 차단)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null); // 비멤버

    await expectAppError(
      enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'ROOM_NOT_FOUND',
    );
    // 멤버십에서 막혔으므로 세션 생성까지 가지 않는다
    expect(db.privateRoomSession.create).not.toHaveBeenCalled();
  });

  it('프라이빗 룸이 없으면 PRIVATE_ROOM_NOT_FOUND', async () => {
    db.privateRoom.findUnique.mockResolvedValue(null); // 그런 프라이빗 룸 없음

    await expectAppError(
      enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'PRIVATE_ROOM_NOT_FOUND',
    );
  });

  it('프라이빗 룸이 해당 룸 소속이 아니면 PRIVATE_ROOM_NOT_FOUND', async () => {
    // 프라이빗 룸은 있지만 다른 룸(other-room) 소속 → 이 룸에선 접근 불가.
    // 존재 여부를 노출하지 않도록 "없음"과 같은 PRIVATE_ROOM_NOT_FOUND 로 통일.
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: 'other-room',
    });

    await expectAppError(
      enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'PRIVATE_ROOM_NOT_FOUND',
    );
  });

  it('열린 세션이 없으면 새 세션을 생성', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    // 현재 입장 중인(아직 안 나간) 세션이 없음 → 새로 입장 가능
    db.privateRoomSession.findFirst.mockResolvedValue(null);
    db.privateRoomSession.create.mockResolvedValue({
      privateRoomId: PRIVATE_ROOM_ID,
      userId: USER_ID,
      enteredAt: new Date('2026-05-18T14:02:00.000Z'),
    });

    const result = await enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID);

    // 새 입장 세션을 올바른 인자로 생성했는가
    expect(db.privateRoomSession.create).toHaveBeenCalledWith({
      data: { privateRoomId: PRIVATE_ROOM_ID, userId: USER_ID },
    });
    // 반환이 snake_case 형태로 잘 나오는가
    expect(result).toEqual({
      private_room_id: PRIVATE_ROOM_ID,
      user_id: USER_ID,
      entered_at: '2026-05-18T14:02:00.000Z',
    });
  });

  it('같은 프라이빗 룸에 이미 입장 중이면 새로 만들지 않고 기존 세션 반환 (멱등)', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    // 이미 "같은" 방에 입장 중인 세션이 있음
    db.privateRoomSession.findFirst.mockResolvedValue({
      privateRoomId: PRIVATE_ROOM_ID,
      userId: USER_ID,
      enteredAt: new Date('2026-05-18T14:02:00.000Z'),
    });

    const result = await enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID);

    // 이미 있으니 새 세션을 만들면 안 됨(멱등)
    expect(db.privateRoomSession.create).not.toHaveBeenCalled();
    expect(result.private_room_id).toBe(PRIVATE_ROOM_ID);
  });

  it('다른 프라이빗 룸에 입장 중이면 ALREADY_IN_PRIVATE_ROOM', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    // 입장하려는 방(pr-1)이 아닌 "다른" 방(pr-other)에 이미 입장 중
    db.privateRoomSession.findFirst.mockResolvedValue({
      privateRoomId: 'pr-other',
      userId: USER_ID,
      enteredAt: new Date(),
    });

    // 한 번에 한 방만 → 충돌 에러
    await expectAppError(
      enterPrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'ALREADY_IN_PRIVATE_ROOM',
    );
  });
});

describe('leavePrivateRoom', () => {
  it('룸 멤버가 아니면 ROOM_NOT_FOUND (비멤버의 회의 강제 취소 차단)', async () => {
    db.roomMember.findFirst.mockResolvedValue(null); // 비멤버

    await expectAppError(
      leavePrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'ROOM_NOT_FOUND',
    );
    // 멤버십에서 막혔으므로 퇴장/회의취소까지 가지 않는다
    expect(db.privateRoomSession.update).not.toHaveBeenCalled();
    expect(db.meeting.updateMany).not.toHaveBeenCalled();
  });

  it('열린 세션이 없으면 NOT_IN_PRIVATE_ROOM', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    // 현재 입장 중인 세션이 없음 → 나갈 게 없음
    db.privateRoomSession.findFirst.mockResolvedValue(null);

    await expectAppError(
      leavePrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID),
      'NOT_IN_PRIVATE_ROOM',
    );
  });

  it('마지막 멤버가 퇴장하면 ongoing 회의를 취소하고 meeting_cancelled=true', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    db.privateRoomSession.findFirst.mockResolvedValue({ id: 'sess-1' }); // 내 세션 있음
    db.privateRoomSession.update.mockResolvedValue({}); // 퇴장 처리(leftAt 기록)
    db.privateRoomSession.count.mockResolvedValue(0); // 내가 나간 뒤 남은 인원 0명
    db.meeting.updateMany.mockResolvedValue({ count: 1 }); // 회의 1건 취소됨

    const result = await leavePrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID);

    // 아무도 안 남았으니 진행 중 회의를 cancelled 로 바꿨는가
    expect(db.meeting.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { privateRoomId: PRIVATE_ROOM_ID, status: 'ongoing' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
    expect(result.meeting_cancelled).toBe(true);
  });

  it('남은 멤버가 있으면 회의를 취소하지 않고 meeting_cancelled=false', async () => {
    db.privateRoom.findUnique.mockResolvedValue({
      id: PRIVATE_ROOM_ID,
      roomId: ROOM_ID,
    });
    db.privateRoomSession.findFirst.mockResolvedValue({ id: 'sess-1' });
    db.privateRoomSession.update.mockResolvedValue({});
    db.privateRoomSession.count.mockResolvedValue(2); // 내가 나가도 2명 남아있음

    const result = await leavePrivateRoom(ROOM_ID, PRIVATE_ROOM_ID, USER_ID);

    // 아직 사람이 남아있으니 회의를 취소하면 안 됨
    expect(db.meeting.updateMany).not.toHaveBeenCalled();
    expect(result.meeting_cancelled).toBe(false);
  });
});

describe('clearActivePrivateRoomSessions', () => {
  it('남은 active 세션이 없으면 빈 배열을 반환하고 아무것도 닫지 않는다', async () => {
    db.privateRoomSession.findMany.mockResolvedValue([]);

    const result = await clearActivePrivateRoomSessions(USER_ID);

    expect(result).toEqual([]);
    expect(db.privateRoomSession.updateMany).not.toHaveBeenCalled();
  });

  it('남은 active 세션을 모두 닫고, 비게 된 방의 회의는 취소하며, 영향 룸 id를 반환한다', async () => {
    // 비정상 종료로 pr-1(room-1) 에 active 세션이 남아있는 상태
    db.privateRoomSession.findMany.mockResolvedValue([
      { privateRoomId: PRIVATE_ROOM_ID, privateRoom: { roomId: ROOM_ID } },
    ]);
    db.privateRoomSession.updateMany.mockResolvedValue({ count: 1 });
    db.privateRoomSession.count.mockResolvedValue(0); // 닫고 나니 빈 방
    db.meeting.updateMany.mockResolvedValue({ count: 1 });

    const result = await clearActivePrivateRoomSessions(USER_ID);

    // 이 유저의 active 세션을 닫았는가
    expect(db.privateRoomSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, leftAt: null } }),
    );
    // 빈 방의 ongoing 회의를 취소했는가
    expect(db.meeting.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { privateRoomId: PRIVATE_ROOM_ID, status: 'ongoing' },
      }),
    );
    // broadcast 대상 메인 룸 id 반환
    expect(result).toEqual([ROOM_ID]);
  });
});
