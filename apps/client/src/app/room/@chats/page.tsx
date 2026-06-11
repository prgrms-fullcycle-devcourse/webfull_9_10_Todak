'use client';

import ChatHeader from './_components/ChatHeader';
import ChatInput from './_components/ChatInput';
import ChatMeetingButton from './_components/ChatMeetingButton';
import ChatMessages from './_components/ChatMessages';
import ChatTabs from './_components/ChatTabs';

import { useState, useRef, useCallback, useEffect } from 'react';
import { use } from 'react';
import { MeetingStatus, TabType } from './_types';
import { useSpaceStore } from '@/store/useSpaceStore';

export default function Chats({
  searchParams,
}: {
  searchParams: Promise<{ room_id: string }>;
}) {
  const { room_id } = use(searchParams);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>('ended');
  const currentPrivateRoomId = useSpaceStore(
    state => state.currentPrivateRoomId,
  );

  const [manualTab, setManualTab] = useState<TabType | null>(null);
  const prevPrivateRoomIdRef = useRef(currentPrivateRoomId);

  useEffect(() => {
    if (prevPrivateRoomIdRef.current !== currentPrivateRoomId) {
      prevPrivateRoomIdRef.current = currentPrivateRoomId;
      setManualTab(null); // 프라이빗룸 변경 시 수동 탭 초기화
    }
  }, [currentPrivateRoomId]);

  const tab: TabType = manualTab ?? (currentPrivateRoomId ? 'private' : 'all');

  const sendMessageRef = useRef<(content: string) => void>(() => {});

  const handleSendReady = useCallback((fn: (content: string) => void) => {
    sendMessageRef.current = fn;
  }, []);

  return (
    <div className="chat-panel-container">
      <ChatHeader meetingStatus={meetingStatus} />
      <ChatTabs tab={tab} onTabChange={setManualTab} />
      {tab === 'private' && !!currentPrivateRoomId && (
        <ChatMeetingButton
          meetingStatus={meetingStatus}
          onToggle={() =>
            setMeetingStatus(prev => (prev === 'ongoing' ? 'ended' : 'ongoing'))
          }
          roomId={room_id}
        />
      )}
      <ChatMessages tab={tab} roomId={room_id} onSendReady={handleSendReady} />
      <ChatInput onSend={content => sendMessageRef.current(content)} />
    </div>
  );
}
