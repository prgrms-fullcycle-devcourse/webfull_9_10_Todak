'use client';

import { Button } from '@heroui/react';

const toggleChat = () => {
  document.getElementById('room-chat-toggle')?.click();
};

export default function ChatOpenButton() {
  return (
    <Button
      className="absolute bottom-[110px] right-3 z-30 flex h-auto min-w-0 cursor-pointer flex-col items-center bg-transparent p-0 transition-transform hover:scale-105 peer-checked/chat:hidden"
      onPress={toggleChat}
      variant="ghost"
    >
      <span className="mb-2 rounded-full bg-accent px-3 py-1 text-[11px] font-black text-accent-foreground shadow-surface">
        💬 채팅 열기
      </span>
      <span className="flex size-16 items-center justify-center rounded-full border-4 border-accent bg-surface text-3xl shadow-surface">
        🦉
      </span>
    </Button>
  );
}
