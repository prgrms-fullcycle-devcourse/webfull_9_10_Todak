import UserProfileForm from './_components/UserProfileForm';

interface CustomizationPageProps {
  params: Promise<{
    user_id: string;
  }>;
  searchParams?: Promise<{
    roomID?: string | string[];
  }>;
}

export default async function CustomizationPage({
  params,
  searchParams,
}: CustomizationPageProps) {
  const { user_id: userID } = await params;
  const resolvedSearchParams = await searchParams;
  const rawRoomID = resolvedSearchParams?.roomID;
  const roomID = Array.isArray(rawRoomID) ? rawRoomID[0] : rawRoomID;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <UserProfileForm roomID={roomID ?? 'TODAK-992F'} userID={userID} />
    </main>
  );
}
