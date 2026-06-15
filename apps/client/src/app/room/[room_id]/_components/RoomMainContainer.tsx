'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';
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
  const setChatOpen = useChatNotificationStore(state => state.setChatOpen);
  const notifyIncomingMessage = useChatNotificationStore(
    state => state.notifyIncomingMessage,
  );
  const clearUnreadChatCount = useChatNotificationStore(
    state => state.clearUnreadChatCount,
  );
  const isMeetingView = currentView === 'meeting';
  const [chatState, setChatState] = useState({
    view: currentView,
    isOpen: false,
  });
  const isChatOpen =
    chatState.view === currentView ? chatState.isOpen : isMeetingView;

  useEffect(() => {
    setChatOpen(isChatOpen);

    if (isChatOpen) {
      clearUnreadChatCount();
    }
  }, [clearUnreadChatCount, isChatOpen, setChatOpen]);

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

      if (isSameRoom && !isChatOpen && !isMyMessage) {
        notifyIncomingMessage();
      }
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [isChatOpen, myGithubUsername, notifyIncomingMessage, roomId]);

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
