import { redirect } from 'next/navigation';

import { apiServer } from '@/lib/api.server';
import { isRoomProfileAlreadySetUpError } from '@/sevice/rooms';

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
  const result = await apiServer.get('/users/me');
  console.log(result);
  if (roomID !== undefined && roomID !== '') {
    await redirectIfRoomProfileAlreadySetUp(roomID);
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <UserProfileForm roomID={roomID ?? ''} userID={userID} />
    </main>
  );
}

async function redirectIfRoomProfileAlreadySetUp(roomID: string) {
  try {
    await apiServer.post<unknown, object>(
      `/rooms/${encodeURIComponent(roomID)}/members/setup`,
      {},
    );
  } catch (error) {
    if (isRoomProfileAlreadySetUpError(error)) {
      redirect(`/room/${encodeURIComponent(roomID)}`);
    }
  }
}
