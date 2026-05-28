import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';

import {
  assertInPrivateRoomSession,
  assertPrivateRoomBelongsToRoom,
  assertRoomMember,
} from './chat.service.js';

export interface ToggleReactionResult {
  messageId: string;
  emoji: string;
  action: 'added' | 'removed';
}

/*
 * 메시지 이모지 반응 토글 (socket chat:react 핸들러에서 호출).
 * 같은 유저가 같은 이모지를 다시 누르면 제거, 아니면 추가.
 * - 메인 룸: 룸 멤버여야 함
 * - 프라이빗 룸: 룸 멤버 + 현재 해당 프라이빗 룸 세션이 열려있어야 함
 */
export async function toggleReaction(
  userId: string,
  input: {
    roomId: string;
    privateRoomId?: string;
    messageId: string;
    emoji: string;
  },
): Promise<ToggleReactionResult> {
  await assertRoomMember(input.roomId, userId);

  if (input.privateRoomId !== undefined) {
    await assertPrivateRoomBelongsToRoom(input.roomId, input.privateRoomId);
    await assertInPrivateRoomSession(input.privateRoomId, userId);
  }

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: input.messageId,
      roomId: input.roomId,
      privateRoomId: input.privateRoomId ?? null,
    },
    select: { id: true },
  });

  if (message === null) {
    throw new AppError('CHAT_MESSAGE_NOT_FOUND');
  }

  const existing = await prisma.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId: input.messageId,
        userId,
        emoji: input.emoji,
      },
    },
    select: { id: true },
  });

  let action: ToggleReactionResult['action'];

  if (existing === null) {
    await prisma.chatReaction.create({
      data: { messageId: input.messageId, userId, emoji: input.emoji },
    });
    action = 'added';
  } else {
    await prisma.chatReaction.delete({ where: { id: existing.id } });
    action = 'removed';
  }

  return { messageId: input.messageId, emoji: input.emoji, action };
}
