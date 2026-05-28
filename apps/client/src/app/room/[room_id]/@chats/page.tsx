'use client';

import ChatHeader from './_components/ChatHeader';
import ChatInput from './_components/ChatInput';
import ChatMessages from './_components/ChatMessages';
import ChatTabs from './_components/ChatTabs';

import { useState } from 'react';

export type TabType = 'all' | 'private';

export default function Chats() {
  const [tab, setTab] = useState<TabType>('all');

  return (
    <div className="chat-panel-container">
      <ChatHeader />
      <ChatTabs tab={tab} onTabChange={setTab} />
      <ChatMessages tab={tab} />
      <ChatInput />
    </div>
  );
}
