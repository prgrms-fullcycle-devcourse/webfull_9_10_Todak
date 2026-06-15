'use client';

import ChatHeader from './_components/ChatHeader';
import ChatInput, { type ChatInputHandle } from './_components/ChatInput';
import ChatMeetingButton from './_components/ChatMeetingButton';
import ChatMessages from './_components/ChatMessages';
import ChatTabs from './_components/ChatTabs';

import { useState, useRef, useCallback, useEffect } from 'react';
import { use } from 'react';
import { MeetingStatus, TabType } from './_types';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { PendingAttachment } from '@/services/chats/model';

export default function Chats({
  params,
}: {
  params: Promise<{ room_id: string }>;
}) {
  const { room_id } = use(params);
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

  const sendMessageRef = useRef<
    (content: string, attachments?: PendingAttachment[]) => Promise<void>
  >(() => Promise.resolve());
  const chatInputRef = useRef<ChatInputHandle>(null);
  const dragDepthRef = useRef(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleSendReady = useCallback(
    (
      fn: (content: string, attachments?: PendingAttachment[]) => Promise<void>,
    ) => {
      sendMessageRef.current = fn;
    },
    [],
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;

    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      chatInputRef.current?.addFiles(files);
    }
  };

  return (
    <div
      className="chat-panel-container relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-xl border border-dashed border-todak-coral-300 bg-white/80 text-xs font-semibold text-todak-coral-500 shadow-2xs">
          파일을 여기에 놓아 채팅에 첨부하기
        </div>
      )}
      <ChatHeader meetingStatus={meetingStatus} tab={tab} />
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
      <ChatInput
        ref={chatInputRef}
        roomId={room_id}
        onSend={(content, attachments) =>
          sendMessageRef.current(content, attachments)
        }
      />
    </div>
  );
}
