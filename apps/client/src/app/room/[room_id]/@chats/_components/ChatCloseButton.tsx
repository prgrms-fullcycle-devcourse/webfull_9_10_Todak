'use client';

import { Button } from '@heroui/react';

const toggleChat = () => {
  document.getElementById('room-chat-toggle')?.click();
};

export default function ChatCloseButton() {
  return (
    <Button
      className="flex size-8 min-w-0 items-center justify-center rounded-lg bg-default p-0 text-sm font-black text-default-foreground transition-colors hover:bg-default-hover"
      isIconOnly
      onPress={toggleChat}
      variant="ghost"
    >
      ×
    </Button>
  );
}
