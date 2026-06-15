'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useChatHistory } from '../_hooks/useChatHistory';
import { useChatSocket } from '../_hooks/useChatSocket';
import { TabType } from '../_types';
import { useSpaceStore } from '@/store/useSpaceStore';
import type {
  ChatAttachment,
  ChatMessage,
  ChatReactionEvent,
  PendingAttachment,
} from '@/services/chats/model';
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

// 헬퍼 함수
function applyReactionToList(
  reactions: ChatMessage['reactions'],
  event: ChatReactionEvent,
): ChatMessage['reactions'] {
  const exists = reactions.find(r => r.emoji === event.emoji);

  if (event.action === 'added') {
    if (exists) {
      return reactions.map(r =>
        r.emoji === event.emoji ? { ...r, count: r.count + 1 } : r,
      );
    }
    return [...reactions, { emoji: event.emoji, count: 1, me: true }];
  }

  return reactions
    .map(r => (r.emoji === event.emoji ? { ...r, count: r.count - 1 } : r))
    .filter(r => r.count > 0);
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
}: {
  msg: ChatMessage;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

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
            <div
              onClick={() => setShowPicker(prev => !prev)}
              className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-foreground transition-colors hover:bg-slate-50"
            >
              {msg.content}
            </div>
          )}

          {showPicker && (
            <div className="absolute -top-10 left-12 z-10 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(msg.id, emoji);
                    setShowPicker(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
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
    ...socketMessages.filter(
      socketMsg => !(history ?? []).some(h => h.id === socketMsg.id),
    ),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const handleMessage = useCallback((msg: ChatMessage) => {
    setSocketMessages(prev => [...prev, msg]);
  }, []);

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const handleReaction = useCallback((event: ChatReactionEvent) => {
    setSocketMessages(prev =>
      prev.map(msg => {
        if (msg.id !== event.message_id) return msg;
        return { ...msg, reactions: applyReactionToList(msg.reactions, event) };
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
        [event.message_id]: applyReactionToList(currentReactions, event),
      };
    });
  }, []);

  const { sendMessage, sendReaction } = useChatSocket({
    roomId,
    privateRoomId: shouldBlockPrivate ? null : privateRoomId,
    onMessage: handleMessage,
    onReaction: handleReaction,
  });

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
        <MessageItem key={msg.id} msg={msg} onReact={sendReaction} />
      ))}
    </div>
  );
}
