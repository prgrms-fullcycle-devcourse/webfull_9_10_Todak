'use client';

import { useParams } from 'next/navigation';
import { useSpaceStore } from '@/store/useSpaceStore';
import { fetchMinutes } from '@/services/minutes/api';
import { useQuery } from '@tanstack/react-query';
import IssueHub from './IssueHub';
import MeetingMinutes from './MeetingMinutes';

export default function MeetingBoard() {
  const params = useParams();
  const roomId = params.room_id as string;
  const currentMinutesId = useSpaceStore(state => state.currentMinutesId);

  const { data: minutes, isLoading } = useQuery({
    queryKey: ['minutes', currentMinutesId],
    queryFn: () => fetchMinutes(roomId, currentMinutesId!),
    enabled: !!currentMinutesId && !!roomId,
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <MeetingMinutes minutes={minutes} isLoading={isLoading} />
      <IssueHub
        actionItems={minutes?.action_items ?? []}
        minutesId={currentMinutesId}
      />
    </div>
  );
}
