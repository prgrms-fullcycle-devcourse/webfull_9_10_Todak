'use client';

import { Button } from '@heroui/react';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';
import Image from 'next/image';

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
  const unreadChatCount = useChatNotificationStore(
    state => state.unreadChatCount,
  );
  const hasUnreadChat = unreadChatCount > 0;

  return (
    <Button
      className="absolute right-4 bottom-4 z-30 flex h-auto min-w-0 cursor-pointer flex-col items-center bg-transparent p-0 transition-transform hover:scale-105 peer-checked/chat:hidden"
      onPress={toggleChat}
      variant="ghost"
      aria-label={
        hasUnreadChat ? `새 채팅 메시지 ${unreadChatCount}개` : '채팅 열기'
      }
    >
      <span
        key={unreadChatCount}
        className={`relative flex size-10 items-center justify-center rounded-full ${
          hasUnreadChat ? 'chat-open-button-unread' : ''
        }`}
      >
        {hasUnreadChat && (
          <span className="chat-unread-speech-bubble" aria-hidden="true">
            부엉! 부엉!
          </span>
        )}
        <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border-4 border-accent bg-surface shadow-surface">
          <Image
            src="/assets/todak-owl-logo.png"
            alt=""
            width={40}
            height={40}
            className={`size-full object-cover ${
              hasUnreadChat ? 'chat-owl-flap' : ''
            }`}
            aria-hidden="true"
          />
        </span>
        {hasUnreadChat && (
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-[10px] font-black text-danger-foreground ring-2 ring-white">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </span>
    </Button>
  );
}
