import {
  SetupRoomMemberInput,
  UpdateRoomMemberInput,
} from '../api/rooms/members/members.schema.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

// 룸 전체 멤버 목록 조회 (멤버만 호출 가능)
export async function getRoomMembers(userId: string, roomId: string) {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const members = await prisma.roomMember.findMany({
    where: { roomId, characterType: { not: null } },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  });

  return {
    members: members.map(m => ({
      github_username: m.user.githubUsername,
      avatar_url: m.user.avatarUrl,
      roles: m.roles,
      detailed_role: m.detailedRole,
      character_type: m.characterType,
      nickname: m.nickname,
      status: m.status,
      is_host: m.isHost,
      pos_x: m.posX,
      pos_y: m.posY,
    })),
    member_count: members.length,
  };
}

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

// 룸 멤버 프로필 수정 (캐릭터/닉네임/역할/세부 직군)
export async function updateRoomMember(
  userId: string,
  roomId: string,
  input: UpdateRoomMemberInput,
) {
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: { user: true },
  });

  if (member === null) {
    throw new AppError('ROOM_MEMBER_NOT_FOUND');
  }

  if (member.characterType === null) {
    throw new AppError('ROOM_MEMBER_NOT_SET_UP');
  }

  const updated = await prisma.roomMember.update({
    where: { id: member.id },
    data: {
      ...(input.character_type !== undefined && {
        characterType: input.character_type,
      }),
      ...(input.nickname !== undefined && { nickname: input.nickname }),
      ...(input.roles !== undefined && { roles: input.roles }),
      ...(input.detailed_role !== undefined && {
        detailedRole: input.detailed_role,
      }),
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
