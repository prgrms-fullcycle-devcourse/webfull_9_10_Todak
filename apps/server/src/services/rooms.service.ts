import { CreateRoomInput } from '../api/rooms/rooms.schema.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { prisma } from '../lib/prisma.js';

import { registerWebhook } from './github.service.js';

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
          isHost: true,
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
      repo: linkedRepo !== null ? { full_name: linkedRepo.fullName } : null,
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
