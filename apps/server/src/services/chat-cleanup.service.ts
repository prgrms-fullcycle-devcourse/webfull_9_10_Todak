import { prisma } from '../lib/prisma.js';

// 프라이빗 룸 채팅 보관 기간 (일). 이 기간이 지난 메시지는 자동 삭제된다.
export const PRIVATE_ROOM_CHAT_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * createdAt 이 보관 기간을 지난 프라이빗 룸 채팅(privateRoomId != null)을 삭제한다.
 * ChatReaction 은 message FK 의 onDelete: Cascade 로 함께 삭제된다.
 * 메인 룸 채팅(privateRoomId == null)은 대상이 아니다.
 */
export async function deleteExpiredPrivateRoomChats(
  retentionDays = PRIVATE_ROOM_CHAT_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

  const { count } = await prisma.chatMessage.deleteMany({
    where: {
      privateRoomId: { not: null },
      createdAt: { lt: cutoff },
    },
  });

  return count;
}
