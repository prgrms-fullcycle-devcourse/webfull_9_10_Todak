'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useChatHistory } from '../_hooks/useChatHistory';
import { useChatSocket } from '../_hooks/useChatSocket';
import { TabType } from '../_types';
import { Avatar, Button, Popover } from '@heroui/react';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';
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
const STICKY_SCROLL_THRESHOLD = 48;

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
function AttachmentItem({
  attachment,
  messageId,
  isMine,
  onReact,
}: {
  attachment: ChatAttachment;
  messageId: string;
  isMine: boolean;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const isImage = attachment.mime.startsWith('image/');

  const handleOpen = () => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
    setShowAttachmentMenu(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = attachment.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');

      link.href = attachment.url;
      link.download = attachment.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } finally {
      setShowAttachmentMenu(false);
    }
  };

  const attachmentPopover = (
    <Popover.Content
      className="border-none bg-transparent p-0 shadow-none"
      placement={isMine ? 'bottom end' : 'bottom start'}
    >
      <Popover.Dialog className="flex min-w-36 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={handleOpen}
          className="h-8 w-full justify-start rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
          열기
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => void handleDownload()}
          className="h-8 w-full justify-start rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          다운로드
        </Button>
        <div className="h-px bg-slate-100" />
        <div className="flex gap-1">
          {EMOJI_OPTIONS.map(emoji => (
            <Button
              key={emoji}
              isIconOnly
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                onReact(messageId, emoji);
                setShowAttachmentMenu(false);
              }}
              className="h-7 w-7 min-w-0 rounded-xl p-0 text-base hover:bg-slate-100"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </Popover.Dialog>
    </Popover.Content>
  );

  const attachmentPreview = isImage ? (
    <div className="cursor-pointer rounded-xl transition-opacity hover:opacity-90">
      <Image
        src={attachment.url}
        alt={attachment.name}
        width={320}
        height={192}
        unoptimized
        className="max-h-48 max-w-full rounded-xl border border-border object-cover"
      />
    </div>
  ) : (
    <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground transition-colors hover:bg-slate-50">
      <span className="text-base">📄</span>
      <span className="max-w-[180px] truncate">{attachment.name}</span>
    </div>
  );

  return (
    <Popover isOpen={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
      <Popover.Trigger>{attachmentPreview}</Popover.Trigger>
      {attachmentPopover}
    </Popover>
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
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const isPending = isPendingMessage(msg);
  const isFailed = msg.localStatus === 'failed';
  const authUser = getStoredAuthUser();
  const isMine =
    authUser !== null && msg.user.github_username === authUser.login;

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
  const hasReactions = msg.reactions.length > 0;
  const handleCopyMessage = async () => {
    if (!msg.content) return;

    await navigator.clipboard.writeText(msg.content);
    setShowMessageMenu(false);
  };
  const messagePopover = (
    <Popover.Content
      className="border-none bg-transparent p-0 shadow-none"
      placement={isMine ? 'bottom end' : 'bottom start'}
    >
      <Popover.Dialog className="flex min-w-36 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => void handleCopyMessage()}
          className="h-8 w-full justify-start rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          복사하기
        </Button>
        <div className="h-px bg-slate-100" />
        <div className="flex gap-1">
          {EMOJI_OPTIONS.map(emoji => (
            <Button
              key={emoji}
              isIconOnly
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                onReact(msg.id, emoji);
                setShowMessageMenu(false);
              }}
              className="h-7 w-7 min-w-0 rounded-xl p-0 text-base hover:bg-slate-100"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </Popover.Dialog>
    </Popover.Content>
  );

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
    <div
      className={`group relative flex items-start gap-2 px-1 py-1.5 ${
        isMine ? 'ml-auto flex-row-reverse justify-start' : ''
      }`}
    >
      <Avatar className="h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        <Avatar.Image
          src={msg.user.avatar_url}
          alt={msg.user.github_username}
          className="h-full w-full rounded-lg object-cover"
        />
        <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-lg text-[10px] font-bold text-slate-500">
          {msg.user.github_username.slice(0, 1).toUpperCase()}
        </Avatar.Fallback>
      </Avatar>
      <div
        className={`flex min-w-0 max-w-[75%] flex-col gap-1 ${
          isMine ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`flex items-center gap-2 ${
            isMine ? 'flex-row-reverse' : ''
          }`}
        >
          <span className="text-[11px] font-bold text-slate-700">
            {msg.user.github_username}
          </span>
        </div>

        {/* 첨부 (이미지/PDF 여러 개 가능) */}
        {msg.attachments?.length > 0 && (
          <div
            className={`flex flex-col gap-1 ${
              isMine ? 'items-end' : 'items-start'
            }`}
          >
            {msg.attachments.map((att, i) => (
              <AttachmentItem
                key={i}
                attachment={att}
                messageId={msg.id}
                isMine={isMine}
                onReact={onReact}
              />
            ))}
          </div>
        )}

        <div className="relative">
          {/* 텍스트가 있을 때만 말풍선 표시 (첨부만 있는 메시지는 생략) */}
          {msg.content && (
            <div
              className={`flex flex-col ${
                isMine ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`flex items-end gap-1.5 ${
                  isMine ? 'flex-row-reverse' : ''
                }`}
              >
                {isPending ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs leading-relaxed transition-colors ${
                      isFailed
                        ? 'border-red-200 bg-white text-red-500'
                        : 'border-border bg-white text-foreground opacity-60'
                    }`}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <Popover
                    isOpen={showMessageMenu}
                    onOpenChange={setShowMessageMenu}
                  >
                    <Popover.Trigger>
                      <div className="cursor-pointer select-text rounded-xl border border-border bg-white px-3 py-2 text-left text-xs leading-relaxed text-foreground transition-colors hover:bg-slate-50">
                        {msg.content}
                      </div>
                    </Popover.Trigger>
                    {messagePopover}
                  </Popover>
                )}
                {isFailed && (
                  <Button
                    isIconOnly
                    size="sm"
                    type="button"
                    variant="ghost"
                    aria-label="실패한 메시지 삭제"
                    onClick={() => onRemoveLocalMessage(msg.id)}
                    className="h-5 w-5 min-w-0 shrink-0 rounded-lg bg-red-100 p-0 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-200"
                  >
                    ×
                  </Button>
                )}
                <span className="mb-0.5 shrink-0 text-[10px] text-slate-400">
                  {time}
                </span>
              </div>
            </div>
          )}
        </div>

        {!isPending && hasReactions && (
          <div
            className={`flex flex-wrap gap-1 ${
              isMine ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.reactions.map((r, i) => (
              <Button
                key={i}
                onClick={() => onReact(msg.id, r.emoji)}
                size="sm"
                variant="ghost"
                className={`h-auto rounded-lg min-w-0 gap-0.5 border px-1 text-[11px] shadow-sm transition-colors ${
                  r.me
                    ? 'border-todak-coral-200 bg-todak-coral-50 text-todak-coral-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.emoji}
                {r.count > 0 && (
                  <span className="pl-0.5 font-semibold text-slate-500">
                    {r.count}
                  </span>
                )}
              </Button>
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
  const [reactionOverrides, setReactionOverrides] = useState<
    Record<string, ChatMessage['reactions']>
  >({});
  const notifyIncomingMessage = useChatNotificationStore(
    state => state.notifyIncomingMessage,
  );

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
    ...pendingMessages.filter(msg => msg.private_room_id === privateRoomId),
    ...socketMessages.filter(
      socketMsg => !(history ?? []).some(h => h.id === socketMsg.id),
    ),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const handleMessage = useCallback(
    (msg: ChatMessage) => {
      const authUser = getStoredAuthUser();
      const isMine =
        authUser !== null && msg.user.github_username === authUser.login;

      if (!isMine) {
        notifyIncomingMessage();
      }

      setPendingMessages(prev =>
        prev.filter(
          pendingMessage => !isMatchingPendingMessage(pendingMessage, msg),
        ),
      );
      setSocketMessages(prev => {
        if (prev.some(prevMsg => prevMsg.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    [notifyIncomingMessage],
  );

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
                      code === 'TOO_MANY_REQUESTS' ? '' : '전송 실패',
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
  const shouldStickToBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container === null) return;

    container.scrollTop = container.scrollHeight;
  }, []);

  const updateStickyScroll = useCallback(() => {
    const container = containerRef.current;
    if (container === null) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldStickToBottomRef.current =
      distanceFromBottom <= STICKY_SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages, scrollToBottom]);

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
      onScroll={updateStickyScroll}
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
