'use client';

import { useState, useRef } from 'react';
import { Button, Input } from '@heroui/react';

export default function ChatInput() {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    // TODO: API 연결 시 여기에 전송 로직
    console.log('전송:', input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface px-3 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 전송하세요..."
          className="h-9 flex-1 rounded-xl border border-border bg-surface px-3.5 text-xs text-foreground placeholder:text-slate-400 focus:border-accent"
          fullWidth
        />
        <Button
          onClick={handleSend}
          isDisabled={!input.trim()}
          variant="primary"
          className="h-9 w-9 min-w-0 rounded-xl bg-accent p-0 text-accent-foreground disabled:opacity-40"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
