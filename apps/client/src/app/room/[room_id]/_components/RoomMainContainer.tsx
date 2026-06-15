'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSpaceStore } from '@/store/useSpaceStore';
import ChatOpenButton from '../@chats/_components/ChatOpenButton';

interface RoomMainContainerProps {
  children: ReactNode;
  chats: ReactNode;
}

export default function RoomMainContainer({
  children,
  chats,
}: RoomMainContainerProps) {
  const currentView = useSpaceStore(state => state.currentView);
  const setChatOpen = useSpaceStore(state => state.setChatOpen);
  const clearUnreadChatCount = useSpaceStore(
    state => state.clearUnreadChatCount,
  );
  const isMeetingView = currentView === 'meeting';
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatVisible = isMeetingView || isChatOpen;

  useEffect(() => {
    setChatOpen(isChatVisible);

    if (isChatVisible) {
      clearUnreadChatCount();
    }
  }, [clearUnreadChatCount, isChatVisible, setChatOpen]);

  return (
    <main className="room-main-container">
      <input
        checked={isChatVisible}
        className="peer/chat sr-only"
        id="room-chat-toggle"
        onChange={event => setIsChatOpen(event.target.checked)}
        type="checkbox"
      />
      <ChatOpenButton />

      <section className="renderer-section-container">{children}</section>

      <aside className="chat-container">{chats}</aside>
    </main>
  );
}
