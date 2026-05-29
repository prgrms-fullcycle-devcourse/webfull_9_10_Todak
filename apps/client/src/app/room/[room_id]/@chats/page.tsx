'use client';

import ChatHeader from './_components/ChatHeader';
import ChatInput from './_components/ChatInput';
import ChatMeetingButton from './_components/ChatMeetingButton';
import ChatMessages from './_components/ChatMessages';
import ChatTabs from './_components/ChatTabs';

import { useState } from 'react';

export type TabType = 'all' | 'private';
export type MeetingStatus = 'ongoing' | 'ended' | 'cancelled';

export default function Chats() {
  const [tab, setTab] = useState<TabType>('all');
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>('ended');

  return (
    <div className="chat-panel-container">
      <ChatHeader meetingStatus={meetingStatus} />
      <ChatTabs tab={tab} onTabChange={setTab} />
      <ChatMeetingButton
        meetingStatus={meetingStatus}
        onToggle={() =>
          setMeetingStatus(prev => (prev === 'ongoing' ? 'ended' : 'ongoing'))
        }
      />
      <ChatMessages tab={tab} />
      <ChatInput />
    </div>
  );
}
