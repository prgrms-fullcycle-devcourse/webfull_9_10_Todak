'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useChatHistory } from '../_hooks/useChatHistory';
import { useChatSocket } from '../_hooks/useChatSocket';
import { TabType } from '../_types';
import { Popover, PopoverArrow } from '@heroui/react';
import { useSpaceStore } from '@/store/useSpaceStore';
import type {
  ChatAttachment,
  ChatMessage,
  ChatReactionEvent,
  PendingAttachment,
} from '@/services/chats/model';
import { getStoredAuthUser } from '@/lib/auth';
import Image from 'next/image';

interface ChatMessagesProps {
  tab: TabType;
  roomId: string;
  onSendReady: (
    sendMessage: (
      content: string,
      attachments?: PendingAttachment[],
    ) => Promise<void>,
  ) => void;
}

const EMOJI_OPTIONS = ['👍', '🔥', '❤️', '😂', '🙂'];
const MEETING_BOUNDARY_EVENT = 'todak:meeting-boundary';

interface MeetingBoundaryEventDetail {
  roomId: string;
  privateRoomId: string | null;
  type: 'meeting_start' | 'meeting_end';
  createdAt: string;
}

type LocalChatMessage = ChatMessage & {
  localStatus?: 'sending' | 'failed';
  errorMessage?: string;
};

// 헬퍼 함수
function applyReactionToList(
  reactions: ChatMessage['reactions'],
  event: ChatReactionEvent,
  isMine: boolean,
): ChatMessage['reactions'] {
  const exists = reactions.find(r => r.emoji === event.emoji);

  if (event.action === 'added') {
    if (exists) {
      return reactions.map(r =>
        r.emoji === event.emoji
          ? { ...r, count: r.count + 1, me: isMine ? true : r.me }
          : r,
      );
    }
    return [...reactions, { emoji: event.emoji, count: 1, me: isMine }];
  }

  return reactions
    .map(r =>
      r.emoji === event.emoji
        ? { ...r, count: r.count - 1, me: isMine ? false : r.me }
        : r,
    )
    .filter(r => r.count > 0);
}

function isPendingMessage(msg: LocalChatMessage) {
  return msg.id.startsWith('local-pending-');
}

function isMatchingPendingMessage(
  pendingMessage: LocalChatMessage,
  message: ChatMessage,
) {
  const sentAt = new Date(pendingMessage.created_at).getTime();
  const receivedAt = new Date(message.created_at).getTime();

  return (
    isPendingMessage(pendingMessage) &&
    pendingMessage.content === message.content &&
    pendingMessage.private_room_id === message.private_room_id &&
    pendingMessage.user.github_username === message.user.github_username &&
    Math.abs(receivedAt - sentAt) < 30_000
  );
}

function getReactionKey(
  event: Pick<ChatReactionEvent, 'message_id' | 'emoji' | 'action'>,
) {
  return `${event.message_id}:${event.emoji}:${event.action}`;
}

function getInverseReactionEvent(event: ChatReactionEvent): ChatReactionEvent {
  return {
    ...event,
    action: event.action === 'added' ? 'removed' : 'added',
  };
}

// 첨부 한 건 렌더 — 이미지는 인라인 썸네일, 그 외(PDF 등)는 파일 카드
function AttachmentItem({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.mime.startsWith('image/');

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={320}
          height={192}
          unoptimized
          className="max-h-48 max-w-full rounded-xl border border-border object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground transition-colors hover:bg-slate-50"
    >
      <span className="text-base">📄</span>
      <span className="max-w-[180px] truncate">{attachment.name}</span>
    </a>
  );
}

function MessageItem({
  msg,
  onReact,
  onRemoveLocalMessage,
}: {
  msg: LocalChatMessage;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveLocalMessage: (messageId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isPending = isPendingMessage(msg);
  const isFailed = msg.localStatus === 'failed';

  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const systemTime = new Date(msg.created_at).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const displayContent =
    msg.type === 'meeting_start'
      ? '회의 시작'
      : msg.type === 'meeting_end'
        ? '회의 종료'
        : (msg.content ?? '');

  if (msg.type === 'meeting_start' || msg.type === 'meeting_end') {
    return (
      <div className="flex items-center gap-2 px-1 py-3">
        <div className="h-px flex-1 bg-border" />
        <div
          className={`rounded-full border px-3 py-1.5 text-center text-[11px] font-bold shadow-sm ${
            msg.type === 'meeting_start'
              ? 'border-todak-coral-200 bg-todak-coral-50 text-todak-coral-500'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <span>{displayContent}</span>
          <span className="ml-2 font-semibold opacity-70">{systemTime}</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-2 px-1 py-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 overflow-hidden">
        <Image
          src={msg.user.avatar_url}
          alt={msg.user.github_username}
          width={32}
          height={32}
          className="h-full w-full object-cover rounded-full"
        />
      </div>
      <div className="flex max-w-[75%] flex-col gap-1 items-start">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700">
            {msg.user.github_username}
          </span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>

        {/* 첨부 (이미지/PDF 여러 개 가능) */}
        {msg.attachments?.length > 0 && (
          <div className="flex flex-col gap-1">
            {msg.attachments.map((att, i) => (
              <AttachmentItem key={i} attachment={att} />
            ))}
          </div>
        )}

        <div className="relative">
          {/* 텍스트가 있을 때만 말풍선 표시 (첨부만 있는 메시지는 생략) */}
          {msg.content && (
            <div className="flex items-center gap-1.5">
              {isPending ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs leading-relaxed transition-colors ${
                    isFailed
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-border bg-surface text-foreground opacity-60'
                  }`}
                >
                  {msg.content}
                </div>
              ) : (
                <Popover isOpen={showPicker} onOpenChange={setShowPicker}>
                  <Popover.Trigger>
                    <button
                      type="button"
                      className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs leading-relaxed text-foreground transition-colors hover:bg-slate-50"
                    >
                      {msg.content}
                    </button>
                  </Popover.Trigger>
                  <Popover.Content
                    className="border-none bg-transparent p-0 shadow-none"
                    placement="bottom start"
                  >
                    <Popover.Dialog className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onReact(msg.id, emoji);
                            setShowPicker(false);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-slate-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
              )}
              {isFailed && (
                <button
                  type="button"
                  aria-label="실패한 메시지 삭제"
                  onClick={() => onRemoveLocalMessage(msg.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-200"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {isFailed && (
            <p className="mt-1 text-[10px] font-semibold text-red-400">
              {msg.errorMessage ?? '전송 실패'}
            </p>
          )}
        </div>

        {msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {msg.reactions.map((r, i) => (
              <button
                key={i}
                onClick={() => onReact(msg.id, r.emoji)}
                className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition-colors ${
                  r.me
                    ? 'border-todak-coral-200 bg-todak-coral-50 text-todak-coral-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.emoji}
                {r.count > 0 && (
                  <span className="font-semibold text-slate-500 pl-0.5">
                    {r.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatMessages({
  tab,
  roomId,
  onSendReady,
}: ChatMessagesProps) {
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );
  const isInPrivateRoom = !!currentPrivateRoomId;
  const isPrivateTab = tab === 'private';
  const shouldBlockPrivate = isPrivateTab && !isInPrivateRoom;

  const privateRoomId =
    tab === 'private' && isInPrivateRoom ? currentPrivateRoomId : null;

  const { data: history } = useChatHistory(roomId, privateRoomId, tab);
  const [socketMessages, setSocketMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<LocalChatMessage[]>(
    [],
  );
  const [meetingBoundaryMessages, setMeetingBoundaryMessages] = useState<
    ChatMessage[]
  >([]);
  const [reactionOverrides, setReactionOverrides] = useState<
    Record<string, ChatMessage['reactions']>
  >({});

  // tab 바뀔 때 소켓 메시지 초기화
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocketMessages([]);
    setReactionOverrides({});
  }, [tab, privateRoomId]);

  // 히스토리 + 소켓 메시지 합치기 (히스토리 메시지엔 override 적용)
  const messages = [
    ...(history ?? []).map(msg => ({
      ...msg,
      reactions: reactionOverrides[msg.id] ?? msg.reactions,
    })),
    ...meetingBoundaryMessages.filter(
      msg => msg.private_room_id === privateRoomId,
    ),
    ...pendingMessages.filter(msg => msg.private_room_id === privateRoomId),
    ...socketMessages.filter(
      socketMsg => !(history ?? []).some(h => h.id === socketMsg.id),
    ),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const handleMessage = useCallback((msg: ChatMessage) => {
    setPendingMessages(prev =>
      prev.filter(
        pendingMessage => !isMatchingPendingMessage(pendingMessage, msg),
      ),
    );
    setSocketMessages(prev => {
      if (prev.some(prevMsg => prevMsg.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    const handleMeetingBoundary = (event: Event) => {
      const { detail } = event as CustomEvent<MeetingBoundaryEventDetail>;
      if (detail.roomId !== roomId) return;

      const authUser = getStoredAuthUser();
      const boundaryMessage: ChatMessage = {
        id: `local-${detail.type}-${detail.createdAt}`,
        room_id: detail.roomId,
        private_room_id: detail.privateRoomId,
        user: {
          github_username: authUser?.login ?? 'system',
          avatar_url: authUser?.avatarUrl ?? '',
        },
        content:
          detail.type === 'meeting_start'
            ? '회의가 시작되었습니다.'
            : '회의가 종료되었습니다.',
        type: detail.type,
        created_at: detail.createdAt,
        reactions: [],
        attachments: [],
      };

      setMeetingBoundaryMessages(prev => [...prev, boundaryMessage]);
    };

    window.addEventListener(MEETING_BOUNDARY_EVENT, handleMeetingBoundary);

    return () => {
      window.removeEventListener(MEETING_BOUNDARY_EVENT, handleMeetingBoundary);
    };
  }, [roomId]);

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const applyReactionEvent = useCallback(
    (event: ChatReactionEvent, isMine: boolean) => {
      setSocketMessages(prev =>
        prev.map(msg => {
          if (msg.id !== event.message_id) return msg;
          return {
            ...msg,
            reactions: applyReactionToList(msg.reactions, event, isMine),
          };
        }),
      );

      setReactionOverrides(prev => {
        const targetMsg = historyRef.current?.find(
          h => h.id === event.message_id,
        ); // ← 여기
        if (!targetMsg) return prev;
        const currentReactions = prev[event.message_id] ?? targetMsg.reactions;
        return {
          ...prev,
          [event.message_id]: applyReactionToList(
            currentReactions,
            event,
            isMine,
          ),
        };
      });
    },
    [],
  );

  const pendingReactionKeysRef = useRef(new Set<string>());

  const handleReaction = useCallback(
    (event: ChatReactionEvent) => {
      const authUser = getStoredAuthUser();
      const isMine = authUser?.id === event.user.id;
      const reactionKey = getReactionKey(event);

      if (isMine && pendingReactionKeysRef.current.has(reactionKey)) {
        pendingReactionKeysRef.current.delete(reactionKey);
        return;
      }

      applyReactionEvent(event, isMine);
    },
    [applyReactionEvent],
  );

  const { sendMessage: sendSocketMessage, sendReaction } = useChatSocket({
    roomId,
    privateRoomId: shouldBlockPrivate ? null : privateRoomId,
    onMessage: handleMessage,
    onReaction: handleReaction,
  });

  const handleRemoveLocalMessage = useCallback((messageId: string) => {
    setPendingMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      const authUser = getStoredAuthUser();
      if (authUser === null) {
        void sendReaction(messageId, emoji);
        return;
      }

      const targetMessage = messages.find(msg => msg.id === messageId);
      const currentReaction = targetMessage?.reactions.find(
        reaction => reaction.emoji === emoji,
      );
      const action = currentReaction?.me === true ? 'removed' : 'added';
      const optimisticEvent: ChatReactionEvent = {
        message_id: messageId,
        room_id: roomId,
        private_room_id: privateRoomId,
        emoji,
        user: {
          id: authUser.id,
          github_username: authUser.login,
          avatar_url: authUser.avatarUrl,
        },
        action,
      };
      const optimisticKey = getReactionKey(optimisticEvent);

      pendingReactionKeysRef.current.add(optimisticKey);
      applyReactionEvent(optimisticEvent, true);

      void sendReaction(messageId, emoji).catch(() => {
        pendingReactionKeysRef.current.delete(optimisticKey);
        applyReactionEvent(getInverseReactionEvent(optimisticEvent), true);
      });
    },
    [applyReactionEvent, messages, privateRoomId, roomId, sendReaction],
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: PendingAttachment[]) => {
      const trimmedContent = content.trim();
      const authUser = getStoredAuthUser();
      const pendingMessage =
        trimmedContent.length > 0
          ? {
              id: `local-pending-${crypto.randomUUID()}`,
              room_id: roomId,
              private_room_id: privateRoomId,
              user: {
                github_username: authUser?.login ?? '나',
                avatar_url: authUser?.avatarUrl ?? '',
              },
              content: trimmedContent,
              type: 'text' as const,
              created_at: new Date().toISOString(),
              reactions: [],
              attachments: [],
              localStatus: 'sending' as const,
            }
          : null;

      if (pendingMessage !== null) {
        setPendingMessages(prev => [...prev, pendingMessage]);
      }

      try {
        const savedMessage = await sendSocketMessage(content, attachments);
        if (pendingMessage !== null) {
          setPendingMessages(prev =>
            prev.filter(msg => msg.id !== pendingMessage.id),
          );
        }
        if (savedMessage !== null) {
          setSocketMessages(prev => {
            if (prev.some(msg => msg.id === savedMessage.id)) return prev;
            return [...prev, savedMessage];
          });
        }
      } catch (error) {
        if (pendingMessage !== null) {
          const code = error instanceof Error ? error.message : '';
          setPendingMessages(prev =>
            prev.map(msg =>
              msg.id === pendingMessage.id
                ? {
                    ...msg,
                    localStatus: 'failed',
                    errorMessage:
                      code === 'TOO_MANY_REQUESTS'
                        ? '너무 빠르게 보냈어요'
                        : '전송 실패',
                  }
                : msg,
            ),
          );
        }
        throw error;
      }
    },
    [privateRoomId, roomId, sendSocketMessage],
  );

  useEffect(() => {
    onSendReady(sendMessage);
  }, [sendMessage, onSendReady]);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  if (shouldBlockPrivate) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        🔒 프라이빗룸에 입장해야 채팅을 볼 수 있어요
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
    >
      {tab === 'private' && (
        <div className="mb-3 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1 text-[11px] text-slate-500">
            <span className="text-xs">🔒</span>
            <span>프라이빗 채팅은 7일 후 자동 삭제됩니다</span>
          </div>
        </div>
      )}
      {messages.map(msg => (
        <MessageItem
          key={msg.id}
          msg={msg}
          onReact={handleReact}
          onRemoveLocalMessage={handleRemoveLocalMessage}
        />
      ))}
    </div>
  );
}
