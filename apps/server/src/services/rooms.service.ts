import {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from '../api/rooms/rooms.schema.js';
import { AppError } from '../errors/AppError.js';
import { isUniqueConstraintError } from '../errors/prisma.js';
import { Prisma } from '../generated/prisma/client/index.js';
import { prisma } from '../lib/prisma.js';

import {
  registerWebhook,
  unregisterWebhook,
  addCollaborator,
  acceptInvitation,
} from './github.service.js';

// 멤버 입장 시 초기 좌표 (맵 중앙 의자 위치)
const SPAWN_POS = { posX: 1292, posY: 560 };

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
      select: { id: true },
    });
    if (!exists) {
      return code;
    }
  }
  throw new AppError('INVITE_CODE_GENERATION_FAILED');
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

  let room;
  try {
    room = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          isHost: true, // 룸 생성자를 방장으로 지정
          ...SPAWN_POS,
        },
      });

      // 룸당 프라이빗 룸(회의실) 2개 자동 생성
      await tx.privateRoom.createMany({
        data: [
          { roomId: newRoom.id, name: '회의실 A' },
          { roomId: newRoom.id, name: '회의실 B' },
        ],
      });

      return newRoom;
    });
  } catch (error) {
    /*
     * findFirst 체크 통과 후 다른 요청이 먼저 같은 레포로 룸을 만든 race.
     * repo.full_name UNIQUE 위반(P2002)을 409 로 변환한다.
     * 방금 등록한 webhook 은 주인 없는 중복이 되므로 정리한다(best-effort).
     */
    if (isUniqueConstraintError(error)) {
      try {
        await unregisterWebhook(accessToken, owner, repo, webhookId);
      } catch {
        console.error(
          `[createRoom] 중복 webhook 해제 실패: ${input.repo_full_name}`,
        );
      }
      throw new AppError('REPO_ALREADY_IN_USE');
    }
    throw error;
  }

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
          repos: {
            select: {
              id: true,
              fullName: true,
              statsCache: true,
              statsCachedAt: true,
            },
          },
          members: {
            select: {
              user: { select: { githubUsername: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  return memberships.map(membership => {
    const { room } = membership;
    const linkedRepo = room.repos[0] ?? null;

    return {
      id: room.id,
      name: room.name,
      status: room.status,
      invite_code: room.inviteCode,
      is_setup_completed: membership.characterType !== null,
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
      repos: {
        select: {
          id: true,
          fullName: true,
          defaultBranch: true,
          statsCache: true,
          statsCachedAt: true,
        },
      },
      members: {
        include: {
          user: { select: { id: true, githubUsername: true, avatarUrl: true } },
        },
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
        id: m.user.id,
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

// 룸 공개 정보 조회 (인증 불필요) — 링크 공유 시 OG 미리보기용 간략 정보
export async function getRoomPublicInfo(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      repos: { select: { fullName: true } },
      members: {
        select: {
          isHost: true,
          user: { select: { githubUsername: true } },
        },
      },
    },
  });

  if (room === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  const host = room.members.find(m => m.isHost) ?? null;
  const linkedRepo = room.repos[0] ?? null;

  return {
    room_name: room.name,
    host_name: host?.user.githubUsername ?? null,
    repo_name: linkedRepo?.fullName ?? null,
    created_at: room.createdAt,
    member_count: room.members.length,
    max_members: room.maxMembers,
    member_names: room.members.map(m => m.user.githubUsername),
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
    include: { room: { include: { members: { select: { id: true } } } } },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  // 룸 정보 수정은 방장만 가능
  if (!membership.isHost) {
    throw new AppError('FORBIDDEN');
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
    select: { id: true, name: true, maxMembers: true },
  });

  if (room === null) {
    throw new AppError('INVALID_INVITE_CODE');
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      /*
       * 같은 룸에 동시 입장하는 요청들을 직렬화하기 위해 룸 행을 잠근다.
       * (정원 카운트와 멤버 생성 사이의 race 로 정원이 초과되는 것을 방지)
       */
      await tx.$queryRaw`SELECT id FROM "room" WHERE id = ${room.id}::uuid FOR UPDATE`;

      const existing = await tx.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId } },
        select: { id: true },
      });
      if (existing !== null) {
        throw new AppError('ALREADY_JOINED');
      }

      const memberCount = await tx.roomMember.count({
        where: { roomId: room.id },
      });
      if (memberCount >= room.maxMembers) {
        throw new AppError('ROOM_FULL');
      }

      await tx.roomMember.create({
        data: { roomId: room.id, userId, ...SPAWN_POS },
      });
    });
  } catch (error) {
    // 락이 막지 못한 잔여 race 도 unique(room_id, user_id) 위반(P2002)으로 한 번 더 차단
    if (isUniqueConstraintError(error)) {
      throw new AppError('ALREADY_JOINED');
    }
    throw error;
  }

  // 룸 입장 성공 후 GitHub 레포 협업자 자동 추가 (non-fatal)
  void autoAddGithubCollaborator(room.id, userId);

  return { room_id: room.id, name: room.name };
}

async function autoAddGithubCollaborator(
  roomId: string,
  joiningUserId: string,
): Promise<void> {
  const [repo, joiningUser, hostMember] = await Promise.all([
    prisma.repo.findFirst({
      where: { roomId },
      select: { fullName: true },
    }),
    prisma.user.findUnique({
      where: { id: joiningUserId },
      select: { accessToken: true, githubUsername: true },
    }),
    prisma.roomMember.findFirst({
      where: { roomId, isHost: true },
      select: { user: { select: { accessToken: true } } },
    }),
  ]);

  if (
    repo === null ||
    joiningUser?.accessToken === null ||
    joiningUser?.accessToken === undefined ||
    joiningUser?.githubUsername === '' ||
    joiningUser?.githubUsername === undefined ||
    hostMember?.user.accessToken === null ||
    hostMember?.user.accessToken === undefined
  ) {
    return;
  }

  const [owner, repoName] = repo.fullName.split('/');

  try {
    const { invitationId } = await addCollaborator(
      hostMember.user.accessToken,
      owner,
      repoName,
      joiningUser.githubUsername,
    );

    if (invitationId !== null) {
      await acceptInvitation(joiningUser.accessToken, invitationId);
    }
  } catch (err) {
    console.error('[joinRoom] GitHub collaborator 자동 추가 실패:', err);
  }
}

// 룸 완전 정리
async function purgeRoom(
  roomId: string,
  accessToken: string,
  linkedRepo: { fullName: string; webhookId: string | null } | null,
) {
  if (linkedRepo?.webhookId !== null && linkedRepo?.webhookId !== undefined) {
    const [owner, repo] = linkedRepo.fullName.split('/');
    try {
      await unregisterWebhook(accessToken, owner, repo, linkedRepo.webhookId);
    } catch {
      // webhook 해제 실패해도(이미 GitHub에서 삭제된 경우 등) 룸 삭제는 계속 진행
      console.error(`[purgeRoom] webhook 해제 실패: ${linkedRepo.fullName}`);
    }
  }

  // 중간 실패 시 전체 롤백되도록 트랜잭션으로 묶어 일괄 삭제
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

// 룸 삭제 => 방장만 가능, webhook 해제 후 관련 레코드 전체 삭제
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

  // 룸 삭제는 방장만 가능
  if (!membership.isHost) {
    throw new AppError('FORBIDDEN');
  }

  const linkedRepo = membership.room.repos[0] ?? null;
  await purgeRoom(roomId, accessToken, linkedRepo);
}

// 룸 탈퇴 => 누구나 가능
export async function leaveRoom(
  userId: string,
  roomId: string,
  accessToken: string,
) {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: { room: { include: { repos: true } } },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  /*
   * 동시 탈퇴 race 에서 멤버 수/방장 판정이 어긋나지 않도록
   * 룸 행을 잠그고 멤버를 tx 안에서 재조회해 판정한다.
   * (마지막 멤버 판정은 tx 안에서 하되, 실제 룸 삭제는 webhook 해제(네트워크)를
   *  포함하므로 락을 풀고 tx 밖에서 purgeRoom 으로 처리한다.)
   */
  const decision = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT id FROM "room" WHERE id = ${roomId}::uuid FOR UPDATE`;

      const members = await tx.roomMember.findMany({
        where: { roomId },
        orderBy: { joinedAt: 'asc' },
        select: { id: true, userId: true, isHost: true },
      });

      // 동시 요청이 먼저 내 멤버십을 처리한 경우
      const me = members.find(m => m.userId === userId);
      if (me === undefined) {
        throw new AppError('ROOM_NOT_FOUND');
      }

      // 내가 마지막 멤버 => 룸 삭제는 tx 밖에서 처리하도록 신호만 반환
      if (members.length <= 1) {
        return { shouldPurge: true, newHostUserId: null as string | null };
      }

      // 남은 멤버가 있는 경우 => (방장이면) 위임 후 내 멤버십만 제거
      let newHostUserId: string | null = null;
      if (me.isHost) {
        // joinedAt 오름차순이므로 나를 제외한 첫 멤버 = 다음으로 가입한 멤버
        const nextHost = members.find(m => m.userId !== userId);
        if (nextHost !== undefined) {
          await tx.roomMember.update({
            where: { id: nextHost.id },
            data: { isHost: true },
          });
          newHostUserId = nextHost.userId;
        }
      }

      await tx.roomMember.delete({ where: { id: me.id } });
      return { shouldPurge: false, newHostUserId };
    },
  );

  if (decision.shouldPurge) {
    const linkedRepo = membership.room.repos[0] ?? null;
    await purgeRoom(roomId, accessToken, linkedRepo);
    return { left: true, room_deleted: true, new_host_user_id: null };
  }

  return {
    left: true,
    room_deleted: false,
    new_host_user_id: decision.newHostUserId,
  };
}
