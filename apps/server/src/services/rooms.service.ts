import {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from '../api/rooms/rooms.schema.js';
import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { prisma } from '../lib/prisma.js';

import { registerWebhook, unregisterWebhook } from './github.service.js';

// XXXX-XXXX 형식의 랜덤 초대 코드 생성
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = (len: number) =>
    Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');

  return `${part(4)}-${part(4)}`;
}

// DB 중복 확인 후 유일한 초대 코드 반환 (최대 10회 재시도)
async function createUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    const exists = await prisma.room.findUnique({
      where: { inviteCode: code },
    });
    if (!exists) {
      return code;
    }
  }
  throw new Error('초대 코드 생성에 실패했습니다.');
}

// 룸 생성
export async function createRoom(
  userId: string,
  accessToken: string,
  input: CreateRoomInput,
) {
  const existingRepo = await prisma.repo.findFirst({
    where: { fullName: input.repo_full_name },
  });
  if (existingRepo !== null) {
    throw new AppError('REPO_ALREADY_IN_USE');
  }

  const [owner, repo] = input.repo_full_name.split('/');

  // Admin 권한 확인 및 webhook 등록 (실패 시 AppError throw → 룸 생성 금지)
  const webhookId = await registerWebhook(accessToken, owner, repo);

  const inviteCode = await createUniqueInviteCode();

  const room = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const newRoom = await tx.room.create({
        data: {
          name: input.name,
          inviteCode,
          maxMembers: input.max_members,
        },
      });

      await tx.repo.create({
        data: {
          roomId: newRoom.id,
          fullName: input.repo_full_name,
          webhookId,
        },
      });

      await tx.roomMember.create({
        data: {
          roomId: newRoom.id,
          userId,
        },
      });

      return newRoom;
    },
  );

  return {
    id: room.id,
    name: room.name,
    invite_code: room.inviteCode,
    repo_full_name: input.repo_full_name,
    webhook_registered: true,
  };
}

// 내가 속한 룸 조회
export async function getRooms(userId: string) {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          repos: true,
          members: {
            include: { user: true },
          },
        },
      },
    },
  });

  return memberships.map(({ room }) => {
    const linkedRepo = room.repos[0] ?? null;

    return {
      id: room.id,
      name: room.name,
      status: room.status,
      invite_code: room.inviteCode,
      repo:
        linkedRepo !== null
          ? { id: linkedRepo.id, full_name: linkedRepo.fullName }
          : null,
      members: room.members.map(({ user }) => ({
        github_username: user.githubUsername,
        avatar_url: user.avatarUrl,
      })),
      member_count: room.members.length,
      last_synced_at: linkedRepo?.statsCachedAt ?? null,
      stats: linkedRepo?.statsCache ?? null,
    };
  });
}

// 특정 룸 상세 조회
export async function getRoomById(userId: string, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      repos: true,
      members: {
        include: { user: true },
      },
    },
  });

  if (room === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const isMember = room.members.some(m => m.userId === userId);
  if (!isMember) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const linkedRepo = room.repos[0] ?? null;

  return {
    id: room.id,
    name: room.name,
    status: room.status,
    invite_code: room.inviteCode,
    max_members: room.maxMembers,
    created_at: room.createdAt,
    repo:
      linkedRepo !== null
        ? {
            id: linkedRepo.id,
            full_name: linkedRepo.fullName,
            default_branch: linkedRepo.defaultBranch,
            stats_cache: linkedRepo.statsCache,
            stats_cached_at: linkedRepo.statsCachedAt,
          }
        : null,
    members: room.members
      .filter(m => m.characterType !== null)
      .map(m => ({
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
    member_count: room.members.filter(m => m.characterType !== null).length,
  };
}

// 룸 정보 수정
export async function updateRoom(
  userId: string,
  roomId: string,
  input: UpdateRoomInput,
) {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: { room: { include: { members: true } } },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  if (
    input.max_members !== undefined &&
    input.max_members < membership.room.members.length
  ) {
    throw new AppError('BAD_REQUEST');
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.max_members !== undefined && { maxMembers: input.max_members }),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    max_members: updated.maxMembers,
  };
}

// 초대 코드로 룸 입장
export async function joinRoom(userId: string, input: JoinRoomInput) {
  const room = await prisma.room.findUnique({
    where: { inviteCode: input.invite_code },
    include: { members: true },
  });

  if (room === null) {
    throw new AppError('INVALID_INVITE_CODE');
  }

  const alreadyMember = room.members.some(m => m.userId === userId);
  if (alreadyMember) {
    throw new AppError('ALREADY_JOINED');
  }

  if (room.members.length >= room.maxMembers) {
    throw new AppError('ROOM_FULL');
  }

  await prisma.roomMember.create({
    data: { roomId: room.id, userId },
  });

  return { room_id: room.id, name: room.name };
}

// 룸 삭제 — webhook 해제 후 관련 레코드 전체 삭제
export async function deleteRoom(
  userId: string,
  roomId: string,
  accessToken: string,
) {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: {
      room: { include: { repos: true } },
    },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const linkedRepo = membership.room.repos[0] ?? null;

  if (linkedRepo?.webhookId !== null && linkedRepo?.webhookId !== undefined) {
    const [owner, repo] = linkedRepo.fullName.split('/');
    try {
      await unregisterWebhook(accessToken, owner, repo, linkedRepo.webhookId);
    } catch {
      // webhook 해제 실패해도 룸 삭제는 계속 진행
      console.error(`[deleteRoom] webhook 해제 실패: ${linkedRepo.fullName}`);
    }
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.notification.deleteMany({ where: { roomId } });
    await tx.todo.deleteMany({ where: { roomId } });
    await tx.meetingParticipant.deleteMany({ where: { meeting: { roomId } } });
    await tx.minutes.deleteMany({ where: { roomId } });
    await tx.chatMessage.deleteMany({ where: { roomId } });
    await tx.meeting.deleteMany({ where: { roomId } });
    await tx.privateRoomSession.deleteMany({
      where: { privateRoom: { roomId } },
    });
    await tx.privateRoom.deleteMany({ where: { roomId } });
    await tx.roomMember.deleteMany({ where: { roomId } });
    await tx.repo.deleteMany({ where: { roomId } });
    await tx.room.delete({ where: { id: roomId } });
  });
}
