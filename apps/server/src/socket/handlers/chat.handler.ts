import { z } from 'zod';

import { AppError } from '../../errors/AppError.js';
import { consumeRateLimit } from '../../middleware/rateLimit.middleware.js';
import { createChat } from '../../services/chat.service.js';
import { toggleReaction } from '../../services/reaction.service.js';
import { toSocketError } from '../socket-error.js';
import {
  ChatReactionEventPayload,
  TypedIO,
  TypedSocket,
} from '../socket.types.js';

// chat:send 폭주 방지 — 유저당 10초에 10개 (초과 시 TOO_MANY_REQUESTS)
const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_WINDOW_MS = 10_000;

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
    // 비정상 클라이언트가 ack 자리에 함수 아닌 값을 보내도 서버가 죽지 않도록 방어
    const safeAck = typeof ack === 'function' ? ack : undefined;
    try {
      // 검증보다 먼저 체크 — 잘못된 메시지로 도배하는 경우도 함께 제한
      const { allowed } = await consumeRateLimit(
        `ratelimit:chat:${user.id}`,
        CHAT_RATE_LIMIT,
        CHAT_RATE_WINDOW_MS,
      );
      if (!allowed) {
        throw new AppError('TOO_MANY_REQUESTS');
      }

      const input = ChatSendSchema.parse(raw);

      const chat = await createChat(user.id, input);

      const channel =
        input.privateRoomId !== undefined
          ? `private-room:${input.privateRoomId}`
          : input.roomId;

      // 본인 포함 broadcast (io.to) → 보낸 사람도 동일 payload 로 수신
      io.to(channel).emit('chat:message', chat);

      safeAck?.({ ok: true, chat });
    } catch (err) {
      const payload = toSocketError(
        err,
        'CHAT_SEND_ERROR',
        '채팅 전송에 실패했습니다.',
      );

      console.error(`[chat:send] ${user.login} error:`, err);

      safeAck?.({ ok: false, ...payload });
      socket.emit('error', payload);
    }
  });

  socket.on('chat:react', async (raw, ack) => {
    const safeAck = typeof ack === 'function' ? ack : undefined;
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

      safeAck?.({ ok: true, reaction: payload });
    } catch (err) {
      const payload = toSocketError(
        err,
        'CHAT_REACT_ERROR',
        '반응 처리에 실패했습니다.',
      );

      console.error(`[chat:react] ${user.login} error:`, err);

      safeAck?.({ ok: false, ...payload });
      socket.emit('error', payload);
    }
  });
}
