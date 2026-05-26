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
