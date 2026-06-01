import { apiServer } from '@/lib/api.server';
import type { MyRooms } from '@/sevice/rooms/model';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

import ProjectHub from './_components/ProjectHub';

interface TeamSelectionPageProps {
  params: Promise<{
    user_id: string;
  }>;
}

export default async function TeamSelectionPage({
  params,
}: TeamSelectionPageProps) {
  const { user_id: userID } = await params;
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['myRooms'],
    queryFn: () => apiServer.get<MyRooms>('/rooms'),
  });

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectHub userID={userID} />
      </HydrationBoundary>
    </main>
  );
}
