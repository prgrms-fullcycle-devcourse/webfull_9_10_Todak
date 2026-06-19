'use client';

import { useParams } from 'next/navigation';
import IssueHub from './IssueHub';
import MeetingMinutes from './MeetingMinutes';
import { useMeetingBoardState } from './useMeetingBoardState';
import { useRoomUiStore } from '@/store/useRoomUiStore';

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useRoomUiStore(state => state.currentMinutesId);
  const {
    actionItems,
    content,
    editorLock,
    generationError,
    handleActionItemsChange,
    handleContentChange,
    handleSave,
    handleSaveWithItems,
    handleStartEdit,
    isContentReady,
    isEditable,
    isLoading,
    lockDenied,
    minutes,
  } = useMeetingBoardState({ currentMinutesId, roomId });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes
        key={currentMinutesId}
        minutes={minutes}
        isLoading={isLoading || !isContentReady}
        content={content}
        generationError={generationError}
        editorLock={editorLock}
        isEditable={isEditable}
        lockDenied={lockDenied}
        onContentChange={handleContentChange}
        onStartEdit={handleStartEdit}
        onSave={handleSave}
      />
      <IssueHub
        actionItems={actionItems}
        minutesId={currentMinutesId}
        onActionItemsChange={handleActionItemsChange}
        onSaveWithItems={handleSaveWithItems}
        roomId={roomId}
      />
    </div>
  );
}
