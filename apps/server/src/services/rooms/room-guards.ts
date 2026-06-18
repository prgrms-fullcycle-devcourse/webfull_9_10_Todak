import { AppError } from '../../errors/AppError.js';
import { prisma } from '../../lib/prisma.js';

/*
 * 룸/프라이빗룸 접근 검증 가드.
 * chat·meeting·private-room·reaction 등 여러 서비스가 공유하는
 * 멤버십·소속·세션 검증을 한곳에 모은다.
 */

// 룸 멤버가 아니면 throw. 룸 존재 자체를 비멤버에게 노출하지 않도록 ROOM_NOT_FOUND 를 쓴다.
export async function assertRoomMember(
  roomId: string,
  userId: string,
): Promise<void> {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });

  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }
}

export async function assertRoomHost(
  roomId: string,
  userId: string,
): Promise<void> {
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { isHost: true },
  });

  // 비멤버
  if (membership === null) {
    throw new AppError('ROOM_NOT_FOUND');
  }

  // 비방장
  if (!membership.isHost) {
    throw new AppError('FORBIDDEN');
  }
}

// 프라이빗 룸이 없거나 해당 룸 소속이 아니면 throw. (존재 여부 비노출을 위해 두 경우 동일 에러)
export async function assertPrivateRoomBelongsToRoom(
  roomId: string,
  privateRoomId: string,
): Promise<void> {
  const privateRoom = await prisma.privateRoom.findUnique({
    where: { id: privateRoomId },
    select: { roomId: true },
  });

  if (privateRoom === null || privateRoom.roomId !== roomId) {
    throw new AppError('PRIVATE_ROOM_NOT_FOUND');
  }
}

// 현재 해당 프라이빗 룸 세션(leftAt === null)이 열려있지 않으면 throw.
export async function assertInPrivateRoomSession(
  privateRoomId: string,
  userId: string,
): Promise<void> {
  const active = await prisma.privateRoomSession.findFirst({
    where: { privateRoomId, userId, leftAt: null },
    select: { id: true },
  });

  if (active === null) {
    throw new AppError('NOT_IN_PRIVATE_ROOM');
  }
}
