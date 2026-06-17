'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/providers/SocketProvider';
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

interface ChatSendAck {
  ok: boolean;
  chat?: ChatMessage;
  code?: string;
  message?: string;
}

interface ChatReactAck {
  ok: boolean;
  reaction?: ChatReactionEvent;
  code?: string;
  message?: string;
}

export function useChatSocket({
  roomId,
  privateRoomId,
  onMessage,
  onReaction,
}: UseChatSocketParams) {
  const { socket, isConnected } = useSocket();
  const onMessageRef = useRef(onMessage);
  const onReactionRef = useRef(onReaction);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onReactionRef.current = onReaction;
  }, [onReaction]);

  const sendMessage = useCallback(
    (
      content: string,
      attachments?: PendingAttachment[],
    ): Promise<ChatMessage | null> => {
      return new Promise((resolve, reject) => {
        socket.emit(
          'chat:send',
          {
            roomId,
            // 빈 텍스트는 서버 스키마(min 1)에 걸리므로 있을 때만 포함 (첨부만 전송 가능)
            ...(content ? { content } : {}),
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
            ...(privateRoomId ? { privateRoomId } : {}),
          },
          (ack: ChatSendAck) => {
            if (ack.ok) {
              resolve(ack.chat ?? null);
            } else {
              reject(new Error(ack.code ?? 'CHAT_SEND_ERROR'));
            }
          },
        );
      });
    },
    [socket, roomId, privateRoomId],
  );

  const sendReaction = useCallback(
    (messageId: string, emoji: string): Promise<ChatReactionEvent> => {
      return new Promise((resolve, reject) => {
        socket.emit(
          'chat:react',
          {
            roomId,
            messageId,
            emoji,
            ...(privateRoomId ? { privateRoomId } : {}),
          },
          (ack: ChatReactAck) => {
            if (ack.ok && ack.reaction !== undefined) {
              resolve(ack.reaction);
              return;
            }

            reject(new Error(ack.code ?? 'CHAT_REACT_ERROR'));
          },
        );
      });
    },
    [socket, roomId, privateRoomId],
  );

  useEffect(() => {
    const handleMessage = (message: ChatMessage) => {
      if (isChatMessageForChannel(message, roomId, privateRoomId)) {
        onMessageRef.current(message);
      }
    };

    const handleReaction = (reaction: ChatReactionEvent) => {
      if (isChatReactionForChannel(reaction, roomId, privateRoomId)) {
        onReactionRef.current(reaction);
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:reaction', handleReaction);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:reaction', handleReaction);
    };
  }, [socket, roomId, privateRoomId]);

  return { sendMessage, sendReaction, isConnected };
}

function isChatMessageForChannel(
  message: ChatMessage,
  roomId: string,
  privateRoomId?: string | null,
) {
  return (
    message.room_id === roomId &&
    (privateRoomId
      ? message.private_room_id === privateRoomId
      : !message.private_room_id)
  );
}

function isChatReactionForChannel(
  reaction: ChatReactionEvent,
  roomId: string,
  privateRoomId?: string | null,
) {
  return (
    reaction.room_id === roomId &&
    (privateRoomId
      ? reaction.private_room_id === privateRoomId
      : reaction.private_room_id === null)
  );
}
