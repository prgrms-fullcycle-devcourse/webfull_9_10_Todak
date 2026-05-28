'use client';

import { useEffect, useRef } from 'react';
import { TabType } from '../page';

interface Message {
  id: string;
  user: {
    github_username: string;
    avatar_url: string;
  };
  content: string | null;
  type: 'text' | 'meeting_start';
  created_at: string;
}

const MOCK_ALL = [
  {
    id: '1',
    user: {
      github_username: 'jiyun-dev',
      avatar_url: '🐱',
    },
    content: '민호님, 오늘 새로운 피그마 안 보셨으면 확인 부탁드려요!',
    type: 'text',
    created_at: '2026-05-18T16:10:00Z',
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
  },
] as const;

const MOCK_PRIVATE = [
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
] as const;

function MessageItem({ msg }: { msg: Message }) {
  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // 시스템 메시지 내용 프론트에서 처리
  const displayContent =
    msg.type === 'meeting_start'
      ? '🚨 회의가 시작되었습니다.'
      : (msg.content ?? '');

  if (msg.type === 'meeting_start') {
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
    <div className={`flex items-start gap-2 px-1 py-1.5`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
        {msg.user.avatar_url}
      </div>
      <div className={`flex max-w-[75%] flex-col gap-1 items-start`}>
        <div className={`flex items-center gap-2`}>
          <span className="text-[11px] font-bold text-slate-700">
            {msg.user.github_username}
          </span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <div
          className={`rounded-xl px-3 py-2 text-xs leading-relaxed 
        border border-border bg-surface text-foreground'
          `}
        >
          {msg.content}
        </div>
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
