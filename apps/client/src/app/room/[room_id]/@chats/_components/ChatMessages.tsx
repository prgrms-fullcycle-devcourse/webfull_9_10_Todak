'use client';

import { useEffect, useRef, useState } from 'react';
import { TabType } from '../page';

interface Reaction {
  emoji: string;
  count: number;
}

interface Message {
  id: string;
  user: {
    github_username: string;
    avatar_url: string;
  };
  content: string | null;
  type: 'text' | 'meeting_start' | 'meeting_end';
  created_at: string;
  reactions?: Reaction[];
}

// 목업 데이터
const MOCK_ALL: Message[] = [
  {
    id: '1',
    user: {
      github_username: 'jiyun-dev',
      avatar_url: '🐱',
    },
    content: '민호님, 오늘 새로운 피그마 안 보셨으면 확인 부탁드려요!',
    type: 'text',
    created_at: '2026-05-18T16:10:00Z',
    reactions: [{ emoji: '👍', count: 2 }],
  },
  {
    id: '2',
    user: {
      github_username: 'minho-dev',
      avatar_url: '🐶',
    },
    content: '아, 라운지 소파 쪽에 계시네요. 확인해 보겠습니다!',
    type: 'text',
    created_at: '2026-05-18T16:11:00Z',
    reactions: [{ emoji: '🔥', count: 1 }],
  },
  {
    id: '3',
    user: {
      github_username: 'sooah-dev',
      avatar_url: '🦊',
    },
    content: '다들 쾌적한 가상 공간에 모여있으니 소통하기 훨씬 편하네요. ☕',
    type: 'text',
    created_at: '2026-05-18T16:12:00Z',
    reactions: [{ emoji: '❤️', count: 3 }],
  },
];

const MOCK_PRIVATE: Message[] = [
  {
    id: 'p1',
    user: {
      github_username: 'soojung-dev',
      avatar_url: '🐼',
    },
    content: '안녕하세요',
    type: 'text',
    created_at: '2026-05-18T16:56:00Z',
  },
  {
    id: 'p2',
    user: {
      github_username: 'hyunwoo-dev',
      avatar_url: '🐻',
    },
    content: '미팅룸 B에서는 백엔드 REST API 명세 정리 회의 시작할게요.',
    type: 'text',
    created_at: '2026-05-18T16:56:30Z',
    reactions: [
      { emoji: '👍', count: 1 },
      { emoji: '🔥', count: 1 },
      { emoji: '❤️', count: 1 },
    ],
  },
  {
    id: 'sys1',
    user: {
      github_username: '시스템',
      avatar_url: '⚙️',
    },
    content: null,
    type: 'meeting_start',
    created_at: '2026-05-18T16:57:00Z',
  },
];

const EMOJI_OPTIONS = ['👍', '🔥', '❤️', '😂', '🙂'];

function MessageItem({ msg }: { msg: Message }) {
  const [reactions, setReactions] = useState<Reaction[]>(msg.reactions ?? []);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // 시스템 메시지 내용 프론트에서 처리
  const displayContent =
    msg.type === 'meeting_start'
      ? '🚨 회의가 시작되었습니다.'
      : msg.type === 'meeting_end'
        ? '✋ 회의가 종료되었습니다.'
        : (msg.content ?? '');

  // TODO: API 연결 시 서버에 요청
  const handleAddReaction = (emoji: string) => {
    setReactions(prev => {
      // 내가 이미 누른 이모지면 취소
      if (myReactions.has(emoji)) {
        setMyReactions(prev => {
          const next = new Set(prev);
          next.delete(emoji);
          return next;
        });
        return prev
          .map(r => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
          .filter(r => r.count > 0);
      }
      // 처음 누르는 이모지
      setMyReactions(prev => new Set(prev).add(emoji));
      const exists = prev.find(r => r.emoji === emoji);
      if (exists)
        return prev.map(r =>
          r.emoji === emoji ? { ...r, count: r.count + 1 } : r,
        );
      return [...prev, { emoji, count: 1 }];
    });
    setShowPicker(false);
  };

  if (msg.type === 'meeting_start' || msg.type === 'meeting_end') {
    return (
      <div className="flex items-start gap-2 px-1 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
          {msg.user.avatar_url}
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">시스템</span>
            <span className="text-[10px] text-slate-300">{time}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            {displayContent}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-2 px-1 py-1.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
        {msg.user.avatar_url}
      </div>
      <div className="flex max-w-[75%] flex-col gap-1 items-start">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700">
            {msg.user.github_username}
          </span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>

        {/* 말풍선 + 이모지 피커 버튼 */}
        <div className="relative">
          <div
            onClick={() => setShowPicker(prev => !prev)}
            className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-foreground transition-colors hover:bg-slate-50"
          >
            {msg.content}
          </div>

          {/* 이모지 피커 - 말풍선 위에 뜸 */}
          {showPicker && (
            <div className="absolute -top-10 left-12 z-10 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 리액션 목록 */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reactions.map((r, i) => (
              <button
                key={i}
                onClick={() => handleAddReaction(r.emoji)}
                className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition-colors ${
                  myReactions.has(r.emoji)
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

export default function ChatMessages({ tab }: { tab: TabType }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = tab === 'all' ? MOCK_ALL : MOCK_PRIVATE;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      {messages.map(msg => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
