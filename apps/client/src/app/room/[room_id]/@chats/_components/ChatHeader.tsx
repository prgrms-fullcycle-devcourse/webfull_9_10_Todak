'use client';

import ChatCloseButton from './ChatCloseButton';

export default function ChatHeader() {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-secondary px-4">
      <div>
        <p className="text-xs font-black text-foreground">채팅</p>
        <p className="font-todak-mono text-[9px] text-muted">
          회의 대기 중(상태)
        </p>
      </div>
      <ChatCloseButton />
    </div>
  );
}
