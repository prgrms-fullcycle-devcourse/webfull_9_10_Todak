'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSpaceStore } from '@/store/useSpaceStore';
import { getAuthToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { ChatMessage } from '@/services/chats/model';
import ChatOpenButton from '../@chats/_components/ChatOpenButton';

interface RoomMainContainerProps {
  children: ReactNode;
  chats: ReactNode;
  roomId: string;
}

export default function RoomMainContainer({
  children,
  chats,
  roomId,
}: RoomMainContainerProps) {
  const currentView = useSpaceStore(state => state.currentView);
  const myGithubUsername = useSpaceStore(state => state.myChar.githubUsername);
  const setChatOpen = useSpaceStore(state => state.setChatOpen);
  const incrementUnreadChatCount = useSpaceStore(
    state => state.incrementUnreadChatCount,
  );
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

  useEffect(() => {
    const token = getAuthToken();
    const socket = getSocket(token ?? undefined);

    if (!socket.connected) {
      socket.connect();
    }

    const handleMessage = (message: ChatMessage) => {
      const isSameRoom = message.room_id === roomId;
      const isMyMessage =
        myGithubUsername !== '' &&
        message.user.github_username === myGithubUsername;

      if (isSameRoom && !isChatVisible && !isMyMessage) {
        incrementUnreadChatCount();
      }
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [incrementUnreadChatCount, isChatVisible, myGithubUsername, roomId]);

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
