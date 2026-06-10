import { AppError } from '@/errors/AppError.js';
import { prisma } from '@/lib/prisma.js';
import { assertPrivateRoomBelongsToRoom } from '@/services/room-guards.js';

export interface PrivateRoomParticipant {
  user_id: string;
  github_username: string;
  entered_at: string;
}

export interface PrivateRoomInfo {
  id: string;
  name: string;
  is_meeting_active: boolean;
  current_participants: PrivateRoomParticipant[];
}

export interface EnterPrivateRoomResult {
  private_room_id: string;
  user_id: string;
  entered_at: string;
}

export interface LeavePrivateRoomResult {
  private_room_id: string;
  user_id: string;
  left_at: string;
  meeting_cancelled: boolean;
}

// 한 룸이 가질 수 있는 프라이빗 룸 최대 개수
const PRIVATE_ROOMS_PER_ROOM = 2;

/**
 * 해당 룸(:roomId)에 속한 private-room 정보와
 * 현재 입장 중인 참여자 목록을 반환합니다.
 * (leftAt === null → 현재 입장 중)
 */
export async function getPrivateRooms(
  roomId: string,
): Promise<PrivateRoomInfo[]> {
  /*
   * 룸 존재 확인과 프라이빗 룸 조회는 독립적이라(둘 다 roomId 만 사용) 병렬로 쏜다.
   * 룸이 없으면 findMany 결과는 버리고 동일하게 NOT_FOUND 를 던진다.
   */
  const [room, privateRooms] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    }),
    prisma.privateRoom.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: PRIVATE_ROOMS_PER_ROOM,
      include: {
        sessions: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                githubUsername: true,
              },
            },
          },
          orderBy: { enteredAt: 'asc' },
        },
        meetings: {
          where: { status: 'ongoing' },
          select: { id: true },
        },
      },
    }),
  ]);

  if (room === null) {
    throw new AppError('NOT_FOUND');
  }

  return privateRooms.map(privateRoom => ({
    id: privateRoom.id,
    name: privateRoom.name,
    is_meeting_active: privateRoom.meetings.length > 0,
    current_participants: privateRoom.sessions.map(session => ({
      user_id: session.userId,
      github_username: session.user.githubUsername,
      entered_at: session.enteredAt.toISOString(),
    })),
  }));
}

/**
 * 프라이빗 룸 입장
 * - 이미 열린 세션(leftAt === null)이 없으면 새 PrivateRoomSession 생성
 * - 기존 세션이 있으면 해당 세션의 enteredAt 을 그대로 반환 (중복 입장 방지)
 */
export async function enterPrivateRoom(
  roomId: string,
  privateRoomId: string,
  userId: string,
): Promise<EnterPrivateRoomResult> {
  await assertPrivateRoomBelongsToRoom(roomId, privateRoomId);

  // 이미 입장 중인 세션 확인
  const existing = await prisma.privateRoomSession.findFirst({
    where: {
      userId,
      leftAt: null,
      privateRoom: { roomId },
    },
    include: {
      privateRoom: true,
    },
  });

  if (existing !== null) {
    // 같은 room 재입장 → 기존 세션 반환
    if (existing.privateRoomId === privateRoomId) {
      return {
        private_room_id: existing.privateRoomId,
        user_id: existing.userId,
        entered_at: existing.enteredAt.toISOString(),
      };
    }

    // 다른 private room 이미 입장 중
    throw new AppError('ALREADY_IN_PRIVATE_ROOM');
  }

  const session = await prisma.privateRoomSession.create({
    data: { privateRoomId, userId },
  });

  return {
    private_room_id: session.privateRoomId,
    user_id: session.userId,
    entered_at: session.enteredAt.toISOString(),
  };
}

/**
 * 프라이빗 룸 퇴장
 * - 해당 유저의 열린 세션(leftAt === null)에 leftAt = now 업데이트
 * - 퇴장 후 현재 입장 중인 멤버가 없으면 ongoing 상태인 회의를 cancelled 로 변경
 *   → meeting_cancelled: true 반환
 */
export async function leavePrivateRoom(
  roomId: string,
  privateRoomId: string,
  userId: string,
): Promise<LeavePrivateRoomResult> {
  const now = new Date();

  await assertPrivateRoomBelongsToRoom(roomId, privateRoomId);

  // 현재 입장 중 세션 확인
  const activeSession = await prisma.privateRoomSession.findFirst({
    where: {
      privateRoomId,
      userId,
      leftAt: null,
    },
  });

  if (activeSession === null) {
    throw new AppError('NOT_IN_PRIVATE_ROOM');
  }

  await prisma.privateRoomSession.update({
    where: {
      id: activeSession.id,
    },
    data: {
      leftAt: now,
    },
  });
  // 퇴장 후 해당 프라이빗 룸의 남은 입장자 수 확인
  const remainingCount = await prisma.privateRoomSession.count({
    where: {
      privateRoomId,
      leftAt: null,
    },
  });

  let meetingCancelled = false;

  // 마지막 멤버가 퇴장한 경우 → 진행 중 회의 자동 취소
  if (remainingCount === 0) {
    const cancelledMeetings = await prisma.meeting.updateMany({
      where: {
        privateRoomId,
        status: 'ongoing',
      },
      data: {
        status: 'cancelled',
        endedAt: now,
      },
    });

    meetingCancelled = cancelledMeetings.count > 0;
  }

  return {
    private_room_id: privateRoomId,
    user_id: userId,
    left_at: now.toISOString(),
    meeting_cancelled: meetingCancelled,
  };
}

/**
 * 비정상 종료(새로고침/탭 닫기) 정합성 보정.
 * leavePrivateRoom 이 호출되지 않아 남은 이 유저의 active 세션(leftAt === null)을 모두 닫고,
 * 그로 인해 비게 된 프라이빗 룸의 ongoing 회의는 취소한다.
 * 화면 갱신 broadcast 를 위해 영향받은 "메인 룸" id 목록을 반환한다. (없으면 빈 배열)
 */
export async function clearActivePrivateRoomSessions(
  userId: string,
): Promise<string[]> {
  const now = new Date();

  // 닫을 세션이 어느 프라이빗룸/메인룸 소속인지 알아야 회의 취소·broadcast 가 가능
  const sessions = await prisma.privateRoomSession.findMany({
    where: { userId, leftAt: null },
    select: {
      privateRoomId: true,
      privateRoom: { select: { roomId: true } },
    },
  });

  if (sessions.length === 0) {
    return [];
  }

  // 이 유저의 active 세션을 한 번에 닫는다
  await prisma.privateRoomSession.updateMany({
    where: { userId, leftAt: null },
    data: { leftAt: now },
  });

  // 비게 된 프라이빗 룸의 ongoing 회의 취소 (leavePrivateRoom 과 동일 규칙)
  const privateRoomIds = [...new Set(sessions.map(s => s.privateRoomId))];
  for (const privateRoomId of privateRoomIds) {
    const remaining = await prisma.privateRoomSession.count({
      where: { privateRoomId, leftAt: null },
    });
    if (remaining === 0) {
      await prisma.meeting.updateMany({
        where: { privateRoomId, status: 'ongoing' },
        data: { status: 'cancelled', endedAt: now },
      });
    }
  }

  // broadcast 대상 메인 룸 id (중복 제거)
  return [...new Set(sessions.map(s => s.privateRoom.roomId))];
}
