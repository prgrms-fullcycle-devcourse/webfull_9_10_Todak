import { redirect } from 'next/navigation';

import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import type { MyRooms } from '@/services/rooms/model';

import UserProfileForm from './_components/UserProfileForm';

interface CustomizationPageProps {
  searchParams?: Promise<{
    roomID?: string | string[];
    roomId?: string | string[];
  }>;
}

export default async function CustomizationPage({
  searchParams,
}: CustomizationPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawRoomID =
    resolvedSearchParams?.roomID ?? resolvedSearchParams?.roomId;
  const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;
  let shouldRefreshAuth = false;

  if (roomID !== undefined && roomID !== '') {
    shouldRefreshAuth = await redirectUserWhenSetupComplete(roomID);
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {shouldRefreshAuth && <AuthRefreshOnMount />}
      <UserProfileForm roomID={roomID ?? ''} />
    </main>
  );
}

async function redirectUserWhenSetupComplete(roomID: string) {
  let rooms: MyRooms;

  try {
    rooms = await apiServer.get<MyRooms>('/rooms');
  } catch (error) {
    if (isApiServerAuthError(error)) {
      return true;
    }

    throw error;
  }

  const currentRoom = rooms.find(room => room.id === roomID);

  if (currentRoom?.is_setup_completed === true) {
    redirect(`/room/${encodeURIComponent(roomID)}`);
  }

  return false;
}
