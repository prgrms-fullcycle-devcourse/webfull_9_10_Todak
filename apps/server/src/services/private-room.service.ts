import { prisma } from '@/lib/prisma.js';

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

/**
 * 해당 룸(:roomId)에 속한 private-room 2개의 정보와
 * 현재 입장 중인 참여자 목록을 반환합니다.
 * (leftAt === null → 현재 입장 중)
 */
export async function getPrivateRooms(
  roomId: string,
): Promise<PrivateRoomInfo[]> {
  const privateRooms = await prisma.privateRoom.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: 2,
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
  });

  return privateRooms.map(room => ({
    id: room.id,
    name: room.name,
    is_meeting_active: room.meetings.length > 0,
    current_participants: room.sessions.map(session => ({
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
  privateRoomId: string,
  userId: string,
): Promise<EnterPrivateRoomResult> {
  // 이미 입장 중인 세션 확인
  const existing = await prisma.privateRoomSession.findFirst({
    where: { privateRoomId, userId, leftAt: null },
  });

  if (existing !== null) {
    return {
      private_room_id: existing.privateRoomId,
      user_id: existing.userId,
      entered_at: existing.enteredAt.toISOString(),
    };
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
  privateRoomId: string,
  userId: string,
): Promise<LeavePrivateRoomResult> {
  const now = new Date();

  // 열린 세션 leftAt 업데이트
  await prisma.privateRoomSession.updateMany({
    where: { privateRoomId, userId, leftAt: null },
    data: { leftAt: now },
  });

  // 퇴장 후 해당 프라이빗 룸의 남은 입장자 수 확인
  const remainingCount = await prisma.privateRoomSession.count({
    where: { privateRoomId, leftAt: null },
  });

  let meetingCancelled = false;

  // 마지막 멤버가 퇴장한 경우 → 진행 중 회의 자동 취소
  if (remainingCount === 0) {
    const cancelledMeetings = await prisma.meeting.updateMany({
      where: { privateRoomId, status: 'ongoing' },
      data: { status: 'cancelled', endedAt: now },
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
