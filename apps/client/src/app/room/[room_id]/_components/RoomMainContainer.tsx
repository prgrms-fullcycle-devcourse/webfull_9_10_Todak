'use client';

import { ReactNode, useState } from 'react';
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
  const isMeetingView = currentView === 'meeting';
  const [chatState, setChatState] = useState({
    view: currentView,
    isOpen: false,
  });
  const isChatOpen =
    chatState.view === currentView ? chatState.isOpen : isMeetingView;

  return (
    <main className="room-main-container">
      <input
        checked={isChatOpen}
        className="peer/chat sr-only"
        id="room-chat-toggle"
        onChange={event =>
          setChatState({
            view: currentView,
            isOpen: event.target.checked,
          })
        }
        type="checkbox"
      />
      <ChatOpenButton />

      <section className="renderer-section-container">{children}</section>

      <aside className="chat-container">{chats}</aside>
    </main>
  );
}
