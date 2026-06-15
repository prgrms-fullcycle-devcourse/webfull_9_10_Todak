import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { getAuthToken } from '@/lib/auth';
import {
  ChatMessage,
  ChatReactionEvent,
  PendingAttachment,
} from '@/services/chats/model';

interface UseChatSocketParams {
  roomId: string;
  privateRoomId?: string | null;
  onMessage: (message: ChatMessage) => void;
  onReaction: (reaction: ChatReactionEvent) => void;
}

export function useChatSocket({
  roomId,
  privateRoomId,
  onMessage,
  onReaction,
}: UseChatSocketParams) {
  const sendMessage = useCallback(
    (
      content: string,
      attachments?: PendingAttachment[],
    ): Promise<ChatMessage | null> => {
      return new Promise((resolve, reject) => {
        const socket = getSocket();
        socket.emit(
          'chat:send',
          {
            roomId,
            // 빈 텍스트는 서버 스키마(min 1)에 걸리므로 있을 때만 포함 (첨부만 전송 가능)
            ...(content ? { content } : {}),
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
            ...(privateRoomId ? { privateRoomId } : {}),
          },
          (ack: {
            ok: boolean;
            chat?: ChatMessage;
            code?: string;
            message?: string;
          }) => {
            if (ack.ok) {
              resolve(ack.chat ?? null);
            } else {
              reject(new Error(ack.code ?? 'CHAT_SEND_ERROR'));
            }
          },
        );
      });
    },
    [roomId, privateRoomId],
  );

  const sendReaction = useCallback(
    (messageId: string, emoji: string) => {
      const socket = getSocket();
      socket.emit(
        'chat:react',
        {
          roomId,
          messageId,
          emoji,
          ...(privateRoomId ? { privateRoomId } : {}),
        },
        (ack: { ok: boolean; code?: string; message?: string }) => {
          if (!ack.ok) {
            console.error('리액션 실패:', ack.code, ack.message);
          }
        },
      );
    },
    [roomId, privateRoomId],
  );

  useEffect(() => {
    const token = getAuthToken();
    const socket = getSocket(token ?? undefined);

    if (!socket.connected) {
      socket.connect();
    }

    const handleMessage = (message: ChatMessage) => {
      if (privateRoomId) {
        if (message.private_room_id === privateRoomId) {
          onMessage(message);
        }
      } else {
        if (!message.private_room_id) {
          onMessage(message);
        }
      }
    };

    const handleReaction = (reaction: ChatReactionEvent) => {
      onReaction(reaction);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:reaction', handleReaction);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:reaction', handleReaction);
    };
  }, [roomId, privateRoomId, onMessage, onReaction]);

  return { sendMessage, sendReaction };
}
