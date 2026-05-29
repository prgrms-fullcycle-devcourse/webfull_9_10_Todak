import { redirect } from 'next/navigation';

import { apiServer } from '@/lib/api.server';
import type { MyRooms } from '@/sevice/rooms/model';

import UserProfileForm from './_components/UserProfileForm';

interface CustomizationPageProps {
  params: Promise<{
    user_id: string;
  }>;
  searchParams?: Promise<{
    roomID?: string | string[];
    roomId?: string | string[];
  }>;
}

export default async function CustomizationPage({
  params,
  searchParams,
}: CustomizationPageProps) {
  const { user_id: userID } = await params;
  const resolvedSearchParams = await searchParams;
  const rawRoomID =
    resolvedSearchParams?.roomID ?? resolvedSearchParams?.roomId;
  const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;

  if (roomID !== undefined && roomID !== '') {
    await redirectUserWhenSetupComplete(roomID);
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <UserProfileForm roomID={roomID ?? ''} userID={userID} />
    </main>
  );
}

async function redirectUserWhenSetupComplete(roomID: string) {
  const rooms = await apiServer.get<MyRooms>('/rooms');
  const currentRoom = rooms.find(room => room.id === roomID);

  if (currentRoom?.is_setup_completed === true) {
    redirect(`/room/${encodeURIComponent(roomID)}`);
  }
}
