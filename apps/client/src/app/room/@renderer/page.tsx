'use client';

import { use } from 'react';
import { useInitRooms } from './_hooks/useInitRooms';
import RendererView from './_components/meeting/RendererView';
import BottomInfoContainer from '../_components/BottomInfoContainer';
import PullRequestNotifications from '../_components/PullRequestNotifications';
import CharacterDetailModal from './_components/2d/CharacterDetailModal';
import { useSpaceStore } from '@/store/useSpaceStore';

export default function RendererPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id: string }>;
}) {
  const { room_id } = use(searchParams);
  const { isReady } = useInitRooms(room_id);
  const currentView = useSpaceStore(state => state.currentView);
  const isMeetingView = currentView === 'meeting';

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-white">
        회의실 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="renderer-container h-full w-full flex flex-col">
      <RendererView roomId={room_id} />
      {!isMeetingView && (
        <>
          <PullRequestNotifications />
          <BottomInfoContainer />
        </>
      )}
      <CharacterDetailModal />
    </div>
  );
}
