import { apiServer, isApiServerAuthError } from '@/lib/api.server';
import { getServerAuthUser } from '@/lib/auth.server';
import type { MyRooms } from '@/services/rooms/model';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

import HomeLeft from './_components/HomeLeft';
import HomeRight from './_components/HomeRight';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getServerAuthUser();
  const queryClient = new QueryClient();

  if (user !== null) {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['myRooms'],
        queryFn: () => apiServer.get<MyRooms>('/rooms'),
      });
    } catch (error) {
      if (!isApiServerAuthError(error)) {
        throw error;
      }
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-16 px-8 py-16 md:grid-cols-[1fr_0.95fr]">
          <HomeLeft isAuthenticated={user !== null} />
          <HomeRight userID={user?.id} />
        </section>
      </HydrationBoundary>
    </main>
  );
}
