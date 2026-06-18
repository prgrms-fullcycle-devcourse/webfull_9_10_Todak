'use client';

import { use } from 'react';
import { useInitRooms } from './_hooks/useInitRooms';
import RendererView from './_components/meeting/RendererView';
import BottomInfoContainer from '../_components/BottomInfoContainer';
import CharacterDetailModal from './_components/2d/CharacterDetailModal';
import { useSpaceStore } from '@/store/useSpaceStore';
import ExitConfirmModal from './_components/meeting/ExitConfirmModal';
import KickedAlertModal from './_components/meeting/KickedAlertModal';

export default function RendererPage({
  params,
}: {
  params: Promise<{ room_id: string }>;
}) {
  const { room_id } = use(params);
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
      {!isMeetingView && <BottomInfoContainer />}
      <CharacterDetailModal />
      <ExitConfirmModal />
      <KickedAlertModal roomID={room_id} />
    </div>
  );
}
