/*
 * room-member.service 유닛 테스트
 *
 * 기본 개념은 meeting.service.test.ts 상단 주석과 동일합니다.
 *   - Prisma(DB)를 가짜로 대체(mock)해서 DB 없이 "로직"만 검증한다.
 *   - 테스트 구조 = Arrange(준비) → Act(실행) → Assert(검증)
 *
 * 여기서 테스트하는 함수:
 *   getRoomMembers         : 룸 멤버 목록 (멤버만 조회 가능, setup 완료자만 노출)
 *   setupRoomMember        : 멤버 최초 1회 setup (캐릭터/닉네임/역할)
 *   updateRoomMemberStatus : 단일 룸에서 status 변경
 *   setUserStatusInAllRooms: 유저가 속한 모든 룸 status 일괄 변경 → roomId 목록 반환
 *   updateRoomMember       : 멤버 프로필 수정 (setup 이후)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import {
  getRoomMembers,
  setUserStatusInAllRooms,
  setupRoomMember,
  updateRoomMember,
  updateRoomMemberStatus,
} from '@/services/rooms/members/room-member.service.js';

// prisma 를 가짜로 대체 — 서비스가 쓰는 roomMember 메서드만 vi.fn() 으로 채운다
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// 타입 에러 없이 .mockResolvedValue 등을 쓰기 위해 any 로 느슨하게 캐스팅
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const ROOM_ID = 'room-1';
const USER_ID = 'user-1';

// "호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

// setup 완료된 멤버 row 한 건(camelCase). 응답에서 snake_case 로 매핑되는지 확인용
function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rm-1',
    roles: ['frontend'],
    detailedRole: 'Frontend Developer',
    characterType: 'cat',
    nickname: '수정',
    status: 'focus',
    isHost: true,
    posX: 1,
    posY: 2,
    user: { id: USER_ID, githubUsername: 'jiyun-dev', avatarUrl: 'http://a/1' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRoomMembers', () => {
  it('멤버가 아니면 ROOM_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(getRoomMembers(USER_ID, ROOM_ID), 'ROOM_NOT_FOUND');
    // 멤버 검증에서 막히면 목록 조회까지 가면 안 됨
    expect(db.roomMember.findMany).not.toHaveBeenCalled();
  });

  it('멤버면 setup 완료 멤버를 snake_case 로 매핑하고 member_count 를 반환', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' }); // 요청자=멤버
    db.roomMember.findMany.mockResolvedValue([memberRow()]);

    const result = await getRoomMembers(USER_ID, ROOM_ID);

    // characterType 이 not null 인 멤버만 조회하도록 쿼리했는가
    expect(db.roomMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId: ROOM_ID, characterType: { not: null } },
      }),
    );
    expect(result.member_count).toBe(1);
    expect(result.members[0]).toEqual({
      id: USER_ID,
      github_username: 'jiyun-dev',
      avatar_url: 'http://a/1',
      roles: ['frontend'],
      detailed_role: 'Frontend Developer',
      character_type: 'cat',
      nickname: '수정',
      status: 'focus',
      is_host: true,
      pos_x: 1,
      pos_y: 2,
    });
  });
});

describe('setupRoomMember', () => {
  const input = {
    character_type: 'cat' as const,
    nickname: '수정',
    roles: ['frontend' as const],
    detailed_role: 'Frontend Developer',
  };

  it('멤버가 없으면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      setupRoomMember(USER_ID, ROOM_ID, input),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('이미 setup(characterType 존재) 되어 있으면 ROOM_MEMBER_ALREADY_SET_UP', async () => {
    db.roomMember.findFirst.mockResolvedValue(memberRow()); // characterType: 'cat'

    await expectAppError(
      setupRoomMember(USER_ID, ROOM_ID, input),
      'ROOM_MEMBER_ALREADY_SET_UP',
    );
    expect(db.roomMember.update).not.toHaveBeenCalled();
  });

  it('아직 setup 안 했으면 입력 값으로 update 하고 snake_case 로 반환', async () => {
    // characterType: null → 아직 setup 안 함
    db.roomMember.findFirst.mockResolvedValue(
      memberRow({ characterType: null }),
    );
    db.roomMember.update.mockResolvedValue(memberRow());

    const result = await setupRoomMember(USER_ID, ROOM_ID, input);

    expect(db.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rm-1' },
        data: {
          characterType: 'cat',
          nickname: '수정',
          roles: ['frontend'],
          detailedRole: 'Frontend Developer',
        },
      }),
    );
    expect(result).toMatchObject({
      github_username: 'jiyun-dev',
      character_type: 'cat',
      nickname: '수정',
    });
  });
});

describe('updateRoomMemberStatus', () => {
  it('멤버가 없으면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      updateRoomMemberStatus(USER_ID, ROOM_ID, 'rest'),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('멤버면 status 를 update 한다', async () => {
    db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
    db.roomMember.update.mockResolvedValue({});

    await updateRoomMemberStatus(USER_ID, ROOM_ID, 'rest');

    expect(db.roomMember.update).toHaveBeenCalledWith({
      where: { id: 'rm-1' },
      data: { status: 'rest' },
    });
  });
});

describe('setUserStatusInAllRooms', () => {
  it('속한 룸이 없으면 updateMany 없이 빈 배열 반환', async () => {
    db.roomMember.findMany.mockResolvedValue([]);

    const result = await setUserStatusInAllRooms(USER_ID, 'away');

    expect(result).toEqual([]);
    expect(db.roomMember.updateMany).not.toHaveBeenCalled();
  });

  it('속한 룸들이 있으면 status 를 일괄 변경하고 roomId 목록을 반환', async () => {
    db.roomMember.findMany.mockResolvedValue([
      { roomId: 'room-1' },
      { roomId: 'room-2' },
    ]);
    db.roomMember.updateMany.mockResolvedValue({ count: 2 });

    const result = await setUserStatusInAllRooms(USER_ID, 'away');

    expect(db.roomMember.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { status: 'away' },
    });
    expect(result).toEqual(['room-1', 'room-2']);
  });
});

describe('updateRoomMember', () => {
  it('멤버가 없으면 ROOM_MEMBER_NOT_FOUND', async () => {
    db.roomMember.findFirst.mockResolvedValue(null);

    await expectAppError(
      updateRoomMember(USER_ID, ROOM_ID, { nickname: '엘리' }),
      'ROOM_MEMBER_NOT_FOUND',
    );
  });

  it('아직 setup 안 했으면(characterType null) ROOM_MEMBER_NOT_SET_UP', async () => {
    db.roomMember.findFirst.mockResolvedValue(
      memberRow({ characterType: null }),
    );

    await expectAppError(
      updateRoomMember(USER_ID, ROOM_ID, { nickname: '엘리' }),
      'ROOM_MEMBER_NOT_SET_UP',
    );
  });

  it('정상이면 전달된 필드만 update 한다 (부분 수정)', async () => {
    db.roomMember.findFirst.mockResolvedValue(memberRow());
    db.roomMember.update.mockResolvedValue(memberRow({ nickname: '엘리' }));

    const result = await updateRoomMember(USER_ID, ROOM_ID, {
      nickname: '엘리',
    });

    // nickname 만 넘겼으니 data 에도 nickname 만 들어가야 함
    expect(db.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rm-1' },
        data: { nickname: '엘리' },
      }),
    );
    expect(result.nickname).toBe('엘리');
  });
});
