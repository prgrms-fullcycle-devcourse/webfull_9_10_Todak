import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import { createChat } from '../../services/chat.service.js';
import { toggleReaction } from '../../services/reaction.service.js';
import {
  ChatReactionEventPayload,
  TypedIO,
  TypedSocket,
} from '../socket.types.js';

const ChatSendSchema = z.object({
  roomId: z.string().uuid(),
  privateRoomId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
});

const ChatReactSchema = z.object({
  roomId: z.string().uuid(),
  privateRoomId: z.string().uuid().optional(),
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(32),
});

/*
 * ────────────────────────────────────────────────────────────
 * 채팅 관련 소켓 이벤트 핸들러
 *
 * 채널 분리
 *   - 메인 룸 채팅      → socket room  `${roomId}`
 *   - 프라이빗 룸 채팅  → socket room  `private-room:${privateRoomId}`
 *
 * (메인 룸 join 은 room.handler.ts:room:join 에서,
 *  프라이빗 룸 join 은 private-room.handler.ts:private-room:enter 에서 처리)
 * ────────────────────────────────────────────────────────────
 */
export function registerChatHandlers(io: TypedIO, socket: TypedSocket) {
  const { user } = socket.data;

  socket.on('chat:send', async (raw, ack) => {
    try {
      const input = ChatSendSchema.parse(raw);

      const chat = await createChat(user.id, input);

      const channel =
        input.privateRoomId !== undefined
          ? `private-room:${input.privateRoomId}`
          : input.roomId;

      // 본인 포함 broadcast (io.to) → 보낸 사람도 동일 payload 로 수신
      io.to(channel).emit('chat:message', chat);

      ack?.({ ok: true, chat });
    } catch (err) {
      const code =
        err instanceof AppError
          ? err.code
          : err instanceof z.ZodError
            ? 'BAD_REQUEST'
            : 'CHAT_SEND_ERROR';
      const message =
        err instanceof Error ? err.message : '채팅 전송에 실패했습니다.';

      console.error(`[chat:send] ${user.login} error:`, err);

      ack?.({ ok: false, code, message });
      socket.emit('error', { code, message });
    }
  });

  socket.on('chat:react', async (raw, ack) => {
    try {
      const input = ChatReactSchema.parse(raw);

      const result = await toggleReaction(user.id, input);

      const channel =
        input.privateRoomId !== undefined
          ? `private-room:${input.privateRoomId}`
          : input.roomId;

      const payload: ChatReactionEventPayload = {
        message_id: result.messageId,
        room_id: input.roomId,
        private_room_id: input.privateRoomId ?? null,
        emoji: result.emoji,
        user: {
          id: user.id,
          github_username: user.login,
          avatar_url: user.avatarUrl,
        },
        action: result.action,
      };

      io.to(channel).emit('chat:reaction', payload);

      ack?.({ ok: true, reaction: payload });
    } catch (err) {
      const code =
        err instanceof AppError
          ? err.code
          : err instanceof z.ZodError
            ? 'BAD_REQUEST'
            : 'CHAT_REACT_ERROR';
      const message =
        err instanceof Error ? err.message : '반응 처리에 실패했습니다.';

      console.error(`[chat:react] ${user.login} error:`, err);

      ack?.({ ok: false, code, message });
      socket.emit('error', { code, message });
    }
  });
}
