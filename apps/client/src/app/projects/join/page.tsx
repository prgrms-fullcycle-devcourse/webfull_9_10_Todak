import AuthRefreshOnMount from '@/app/_components/AuthRefreshOnMount';
import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import type { MyRooms } from '@/services/rooms/model';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

import ProjectHub from './_components/ProjectHub';

export default async function TeamSelection() {
  const queryClient = new QueryClient();
  let shouldRefreshAuth = false;

  try {
    await queryClient.prefetchQuery({
      queryKey: ['myRooms'],
      queryFn: () => apiServer.get<MyRooms>('/rooms'),
    });
  } catch (error) {
    if (!isApiServerAuthError(error)) {
      throw error;
    }

    shouldRefreshAuth = true;
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {shouldRefreshAuth && <AuthRefreshOnMount />}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectHub />
      </HydrationBoundary>
    </main>
  );
}
