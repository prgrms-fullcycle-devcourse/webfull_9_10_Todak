/*
 * meeting.service 유닛 테스트
 *
 * ▷ 무엇을 테스트하나?
 *   회의 관련 서비스 함수(startMeeting/endMeeting/listMeetings/getMeetingChats)의
 *   "로직"만 검증합니다. 실제 DB에는 붙지 않습니다.
 *
 * ▷ 왜 DB에 안 붙나? → Prisma를 "모킹(가짜로 대체)"하기 때문
 *   meeting.service 는 내부에서 prisma(=DB 클라이언트)를 호출합니다.
 *   테스트에선 진짜 DB 대신 "가짜 prisma"를 끼워넣어서,
 *   - "이 함수가 prisma를 올바른 인자로 호출했는지"
 *   - "prisma가 이런 값을 돌려줬을 때 함수가 올바른 결과를 만드는지"
 *   를 확인합니다. (DB 없이 빠르게, 분기/예외까지 검증 가능)
 *
 * ▷ 테스트 한 개의 기본 구조 = AAA
 *   1) Arrange(준비): 가짜 prisma가 뭘 돌려줄지 정해둔다 (mockResolvedValue)
 *   2) Act(실행):     테스트할 함수를 호출한다
 *   3) Assert(검증):  결과나 "prisma가 어떻게 불렸는지"를 expect 로 확인한다
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma.js';
import {
  endMeeting,
  getMeetingChats,
  listMeetings,
  startMeeting,
} from '@/services/meeting.service.js';

/*
 * '@/lib/prisma.js' 모듈을 통째로 가짜로 바꾼다.
 * 서비스가 쓰는 prisma 메서드(findFirst, create ...)를 전부 vi.fn()(빈 가짜 함수)으로 대체.
 * vi.fn() 은 "호출 기록을 남기고, 원하는 반환값을 주입할 수 있는" 가짜 함수예요.
 * (vi.mock 은 파일 맨 위로 끌어올려져 실행되므로, 아래 import 보다 먼저 적용됩니다)
 */
vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    roomMember: { findFirst: vi.fn() },
    privateRoom: { findUnique: vi.fn() },
    meeting: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    meetingParticipant: {
      create: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    chatMessage: { findMany: vi.fn() },
  },
}));

/*
 * 위에서 prisma 를 가짜로 바꿨지만, 타입상으론 여전히 진짜 PrismaClient 라서
 * .mockResolvedValue 같은 가짜 함수 전용 메서드를 쓰면 타입 에러가 납니다.
 * 테스트에선 부분 객체만 돌려줘도 충분하므로 any 로 느슨하게 캐스팅해 db 로 부릅니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// 테스트 전반에서 재사용할 고정 ID들 (값 자체는 의미 없고, 그냥 식별용 문자열)
const ROOM_ID = 'room-1';
const PRIVATE_ROOM_ID = 'pr-1';
const HOST_ID = 'user-host';
const MEETING_ID = 'meeting-1';

/*
 * 서비스 함수들은 시작할 때 "요청자가 룸 멤버인지" 검사(assertRoomMember)합니다.
 * 그 검사는 내부적으로 roomMember.findFirst 를 호출하는데,
 * null 을 돌려주면 "멤버 아님 → 에러", 객체를 돌려주면 "멤버 맞음 → 통과".
 * 대부분의 테스트는 "멤버 맞음"을 전제로 하므로 헬퍼로 묶었습니다.
 */
function asMember() {
  db.roomMember.findFirst.mockResolvedValue({ id: 'rm-1' });
}

// 프라이빗 룸이 해당 룸 소속인지 검사(assertPrivateRoomBelongsToRoom) 통과시키는 헬퍼
function privateRoomBelongs() {
  db.privateRoom.findUnique.mockResolvedValue({ roomId: ROOM_ID });
}

/*
 * "이 함수를 호출하면 특정 code 의 AppError 가 던져진다"를 검증하는 헬퍼.
 * rejects = Promise 가 실패(throw)하기를 기대,
 * toMatchObject({ code }) = 던져진 에러 객체에 그 code 필드가 있는지 확인.
 */
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

/*
 * 매 테스트 시작 전에 모든 가짜 함수의 "기록과 주입값"을 초기화.
 * 안 하면 앞 테스트에서 설정한 mockResolvedValue/호출기록이 다음 테스트에 새어나갑니다.
 */
beforeEach(() => {
  vi.clearAllMocks();
});

// describe = 관련 테스트 묶음, it = 테스트 한 개("~하면 ~한다")
describe('startMeeting', () => {
  it('룸 멤버가 아니면 ROOM_NOT_FOUND', async () => {
    // Arrange: 멤버 조회가 null → "멤버 아님" 상황을 만든다
    db.roomMember.findFirst.mockResolvedValue(null);

    // Act + Assert: 호출하면 ROOM_NOT_FOUND 에러가 나야 한다
    await expectAppError(
      startMeeting(ROOM_ID, PRIVATE_ROOM_ID, HOST_ID),
      'ROOM_NOT_FOUND',
    );
  });

  it('프라이빗 룸이 해당 룸 소속이 아니면 PRIVATE_ROOM_NOT_FOUND', async () => {
    asMember(); // 멤버십은 통과시키고
    // 프라이빗 룸의 roomId 가 다른 룸 → "이 룸 소속 아님"
    db.privateRoom.findUnique.mockResolvedValue({ roomId: 'other-room' });

    await expectAppError(
      startMeeting(ROOM_ID, PRIVATE_ROOM_ID, HOST_ID),
      'PRIVATE_ROOM_NOT_FOUND',
    );
  });

  it('진행 중 회의가 없으면 새 회의를 생성하고 host 1명을 참여자로 반환', async () => {
    // Arrange
    asMember();
    privateRoomBelongs();
    db.meeting.findFirst.mockResolvedValue(null); // 진행 중(ongoing) 회의 없음
    // create 가 호출되면 이런 회의 row 가 만들어졌다고 가정
    db.meeting.create.mockResolvedValue({
      id: MEETING_ID,
      status: 'ongoing',
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      hostId: HOST_ID,
    });
    db.meetingParticipant.create.mockResolvedValue({});

    // Act
    const result = await startMeeting(ROOM_ID, PRIVATE_ROOM_ID, HOST_ID);

    // Assert 1: 새 회의를 정확히 1번 생성했는가
    expect(db.meeting.create).toHaveBeenCalledOnce();
    // Assert 2: 호스트를 참여자로 기록했는가 (어떤 인자로 호출됐는지 확인)
    expect(db.meetingParticipant.create).toHaveBeenCalledWith({
      data: { meetingId: MEETING_ID, userId: HOST_ID },
    });
    // Assert 3: 반환 형태가 기대대로인가 (시작 직후라 참여자는 host 1명)
    expect(result).toEqual({
      id: MEETING_ID,
      status: 'ongoing',
      started_at: '2026-05-18T14:02:00.000Z',
      host_id: HOST_ID,
      participants: [HOST_ID],
    });
  });

  it('이미 진행 중 회의가 있으면 새로 만들지 않고 기존 회의를 멱등 반환 (chatters + host)', async () => {
    asMember();
    privateRoomBelongs();
    // findFirst 가 "이미 진행 중인 회의"를 돌려줌 → 새로 만들면 안 됨(멱등)
    db.meeting.findFirst.mockResolvedValue({
      id: MEETING_ID,
      status: 'ongoing',
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      endedAt: null,
      roomId: ROOM_ID,
      privateRoomId: PRIVATE_ROOM_ID,
      hostId: HOST_ID,
    });
    // 회의 구간에 채팅을 남긴 사람들(중복 제거된 userId 목록이라고 가정)
    db.chatMessage.findMany.mockResolvedValue([
      { userId: 'user-a' },
      { userId: HOST_ID },
    ]);

    const result = await startMeeting(ROOM_ID, PRIVATE_ROOM_ID, HOST_ID);

    // 핵심: 이미 있으니 create 는 절대 호출되면 안 된다
    expect(db.meeting.create).not.toHaveBeenCalled();
    expect(result.id).toBe(MEETING_ID);
    expect(result.host_id).toBe(HOST_ID);
    // 참여자 = 채팅한 사람 ∪ host. host(user-host)는 이미 목록에 있으니 중복 안 됨
    expect(result.participants).toEqual(['user-a', HOST_ID]);
  });
});

describe('endMeeting', () => {
  it('회의가 없으면 MEETING_NOT_FOUND', async () => {
    asMember();
    db.meeting.findFirst.mockResolvedValue(null); // 해당 회의 없음

    await expectAppError(
      endMeeting(ROOM_ID, MEETING_ID, HOST_ID),
      'MEETING_NOT_FOUND',
    );
  });

  it('진행 중 회의를 종료하면 status=ended 로 갱신하고 chatters를 참여자로 스냅샷', async () => {
    asMember();
    // 진행 중인 회의를 종료하는 상황
    db.meeting.findFirst.mockResolvedValue({
      id: MEETING_ID,
      status: 'ongoing',
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      endedAt: null,
      roomId: ROOM_ID,
      privateRoomId: PRIVATE_ROOM_ID,
      hostId: HOST_ID,
    });
    db.meeting.update.mockResolvedValue({});
    // 회의 구간 채팅 3건 (user-a 2번, user-b 1번) → 메시지 수=3, 사람 수=2
    db.chatMessage.findMany.mockResolvedValue([
      { userId: 'user-a' },
      { userId: 'user-a' },
      { userId: 'user-b' },
    ]);
    db.meetingParticipant.findMany.mockResolvedValue([]); // 기존에 기록된 참여자 없음
    db.meetingParticipant.createMany.mockResolvedValue({ count: 2 });

    const result = await endMeeting(ROOM_ID, MEETING_ID, HOST_ID);

    // 회의 상태를 ended 로 갱신했는가
    // (objectContaining = "이 키들이 들어있으면 OK", 나머지 필드는 신경 안 씀)
    expect(db.meeting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEETING_ID },
        data: expect.objectContaining({ status: 'ended' }),
      }),
    );
    // 채팅한 사람(중복 제거 user-a, user-b)만 참여자로 스냅샷 저장했는가
    expect(db.meetingParticipant.createMany).toHaveBeenCalledWith({
      data: [
        { meetingId: MEETING_ID, userId: 'user-a' },
        { meetingId: MEETING_ID, userId: 'user-b' },
      ],
    });
    expect(result.status).toBe('ended');
    expect(result.message_count).toBe(3); // 채팅 메시지 "총 개수"(사람 수 아님)
  });

  it('이미 종료된 회의면 update 하지 않고 기존 status/ended_at 유지 (멱등)', async () => {
    asMember();
    const endedAt = new Date('2026-05-18T14:32:00.000Z');
    // 이미 ended 상태인 회의를 다시 종료 요청
    db.meeting.findFirst.mockResolvedValue({
      id: MEETING_ID,
      status: 'ended',
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      endedAt,
      roomId: ROOM_ID,
      privateRoomId: PRIVATE_ROOM_ID,
      hostId: HOST_ID,
    });
    db.chatMessage.findMany.mockResolvedValue([]);
    db.meetingParticipant.findMany.mockResolvedValue([]);

    const result = await endMeeting(ROOM_ID, MEETING_ID, HOST_ID);

    // 이미 끝난 회의라 다시 update 하면 안 됨(멱등)
    expect(db.meeting.update).not.toHaveBeenCalled();
    expect(result.status).toBe('ended');
    // 기존 종료 시각을 그대로 유지(새 시각으로 안 덮음)
    expect(result.ended_at).toBe(endedAt.toISOString());
  });
});

describe('listMeetings', () => {
  it('participant_count는 chatters∪host, message_count·minutes_id를 매핑', async () => {
    asMember();
    // 회의 1건 (회의록 minutes 가 연결돼 있는 경우)
    db.meeting.findMany.mockResolvedValue([
      {
        id: MEETING_ID,
        status: 'ended',
        startedAt: new Date('2026-05-18T14:02:00.000Z'),
        endedAt: new Date('2026-05-18T14:32:00.000Z'),
        roomId: ROOM_ID,
        privateRoomId: PRIVATE_ROOM_ID,
        hostId: HOST_ID,
        minutes: { id: 'minutes-1' },
      },
    ]);
    // 채팅한 사람: user-a (2건). 여기에 host 가 합쳐져 참여자 2명이 되어야 함
    db.chatMessage.findMany.mockResolvedValue([
      { userId: 'user-a' },
      { userId: 'user-a' },
    ]);

    const result = await listMeetings(ROOM_ID, HOST_ID);

    expect(result).toHaveLength(1);
    // toMatchObject = 결과에 이 필드들이 이 값으로 들어있으면 통과(나머지는 무시)
    expect(result[0]).toMatchObject({
      id: MEETING_ID,
      status: 'ended',
      participant_count: 2, // user-a + host
      message_count: 2,
      minutes_id: 'minutes-1',
    });
  });

  it('회의록이 없으면 minutes_id는 null', async () => {
    asMember();
    db.meeting.findMany.mockResolvedValue([
      {
        id: MEETING_ID,
        status: 'ongoing',
        startedAt: new Date('2026-05-18T14:02:00.000Z'),
        endedAt: null, // 진행 중 → 종료 시각 없음
        roomId: ROOM_ID,
        privateRoomId: PRIVATE_ROOM_ID,
        hostId: HOST_ID,
        minutes: null, // 연결된 회의록 없음
      },
    ]);
    db.chatMessage.findMany.mockResolvedValue([]); // 채팅 없음

    const result = await listMeetings(ROOM_ID, HOST_ID);

    expect(result[0].minutes_id).toBeNull();
    expect(result[0].ended_at).toBeNull();
    // 채팅한 사람이 없어도 host 는 항상 참여자로 포함 → 최소 1명
    expect(result[0].participant_count).toBe(1);
  });
});

describe('getMeetingChats', () => {
  it('회의가 없으면 MEETING_NOT_FOUND', async () => {
    asMember();
    db.meeting.findFirst.mockResolvedValue(null);

    await expectAppError(
      getMeetingChats(ROOM_ID, MEETING_ID, HOST_ID),
      'MEETING_NOT_FOUND',
    );
  });

  it('limit을 넘기면 take로 전달하고 snake_case로 매핑', async () => {
    asMember();
    db.meeting.findFirst.mockResolvedValue({
      id: MEETING_ID,
      roomId: ROOM_ID,
      privateRoomId: PRIVATE_ROOM_ID,
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      endedAt: new Date('2026-05-18T14:32:00.000Z'),
    });
    // DB row 는 camelCase(githubUsername...). 서비스가 snake_case 로 바꿔주는지 볼 것
    db.chatMessage.findMany.mockResolvedValue([
      {
        id: 'chat-1',
        content: '안녕하세요',
        type: 'text',
        createdAt: new Date('2026-05-18T14:05:00.000Z'),
        user: { githubUsername: 'jiyun-dev', avatarUrl: 'http://a/1.png' },
      },
    ]);

    const result = await getMeetingChats(ROOM_ID, MEETING_ID, HOST_ID, 10);

    // limit=10 을 넘겼으니, prisma 조회에 take:10 이 포함됐는지 확인
    expect(db.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
    // 응답이 snake_case 형태로 잘 매핑됐는지 (githubUsername → github_username 등)
    expect(result[0]).toEqual({
      id: 'chat-1',
      user: { github_username: 'jiyun-dev', avatar_url: 'http://a/1.png' },
      content: '안녕하세요',
      type: 'text',
      created_at: '2026-05-18T14:05:00.000Z',
    });
  });

  it('limit이 없으면 take를 전달하지 않음 (전체 반환)', async () => {
    asMember();
    db.meeting.findFirst.mockResolvedValue({
      id: MEETING_ID,
      roomId: ROOM_ID,
      privateRoomId: PRIVATE_ROOM_ID,
      startedAt: new Date('2026-05-18T14:02:00.000Z'),
      endedAt: null,
    });
    db.chatMessage.findMany.mockResolvedValue([]);

    await getMeetingChats(ROOM_ID, MEETING_ID, HOST_ID); // limit 안 넘김

    // mock.calls[0][0] = "첫 번째 호출의 첫 번째 인자"(= findMany 에 넘긴 옵션 객체)
    // limit 이 없으면 take 키 자체가 없어야 함(= 전체 반환)
    const callArg = db.chatMessage.findMany.mock.calls[0][0];
    expect(callArg.take).toBeUndefined();
  });
});
