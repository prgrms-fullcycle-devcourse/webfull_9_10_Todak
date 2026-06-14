'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import IssueHub from './IssueHub';
import MeetingMinutes from './MeetingMinutes';
import { useState } from 'react';
import { ActionItem } from '@/services/minutes/model';
import { fetchMinutes, updateMinutes } from '@/services/minutes/api';
import { useSpaceStore } from '@/store/useSpaceStore';

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useSpaceStore(state => state.currentMinutesId);

  const { data: minutes, isLoading } = useQuery({
    queryKey: ['minutes', currentMinutesId],
    queryFn: () => fetchMinutes(roomId, currentMinutesId!),
    enabled: !!currentMinutesId && !!roomId,
  });

  // 공유 상태
  const [content, setContent] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // content - API 데이터 오면 자동 반영, 수정하면 수정값 우선
  const displayContent = content || minutes?.content_md || '';

  // actionItems - minutes 로드되면 그걸 쓰고, 수정하면 수정값 우선
  const displayActionItems =
    actionItems.length > 0 ? actionItems : (minutes?.action_items ?? []);

  // 저장 함수
  const handleSave = async () => {
    if (!currentMinutesId) return;
    await updateMinutes(roomId, currentMinutesId, {
      content_md: displayContent,
      action_items: displayActionItems,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes
        minutes={minutes}
        isLoading={isLoading}
        content={displayContent}
        onContentChange={setContent}
        onSave={handleSave}
      />
      <IssueHub
        actionItems={displayActionItems}
        minutesId={currentMinutesId}
        onActionItemsChange={setActionItems}
        onSave={handleSave}
        roomId={roomId}
      />
    </div>
  );
}
