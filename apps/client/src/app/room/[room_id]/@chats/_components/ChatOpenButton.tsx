'use client';

import { Button } from '@heroui/react';

const toggleChat = () => {
  document.getElementById('room-chat-toggle')?.click();
};

export const openChatSafely = () => {
  const toggleEl = document.getElementById(
    'room-chat-toggle',
  ) as HTMLInputElement | null;

  if (toggleEl && !toggleEl.checked) {
    toggleEl.click();
  }
};

export default function ChatOpenButton() {
  return (
    <Button
      className="absolute right-4 bottom-4 z-30 flex h-auto min-w-0 cursor-pointer flex-col items-center bg-transparent p-0 transition-transform hover:scale-105 peer-checked/chat:hidden"
      onPress={toggleChat}
      variant="ghost"
    >
      <span className="flex size-10 items-center justify-center rounded-full border-4 border-accent bg-surface text-xl shadow-surface">
        🦉
      </span>
    </Button>
  );
}
