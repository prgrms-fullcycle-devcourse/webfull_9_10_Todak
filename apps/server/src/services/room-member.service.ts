import { SetupRoomMemberInput } from '../api/rooms/members/members.schema.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

// 룸 멤버 최초 1회 setup (캐릭터/닉네임/역할/세부 직군 설정)
export async function setupRoomMember(
  userId: string,
  roomId: string,
  input: SetupRoomMemberInput,
) {
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: { user: true },
  });

  if (member === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  if (member.characterType !== null) {
    throw new AppError('ROOM_MEMBER_ALREADY_SET_UP');
  }

  const updated = await prisma.roomMember.update({
    where: { id: member.id },
    data: {
      characterType: input.character_type,
      nickname: input.nickname,
      roles: input.roles,
      detailedRole: input.detailed_role ?? null,
    },
    include: { user: true },
  });

  return {
    github_username: updated.user.githubUsername,
    avatar_url: updated.user.avatarUrl,
    roles: updated.roles,
    detailed_role: updated.detailedRole,
    character_type: updated.characterType,
    nickname: updated.nickname,
    status: updated.status,
    is_host: updated.isHost,
    pos_x: updated.posX,
    pos_y: updated.posY,
  };
}
