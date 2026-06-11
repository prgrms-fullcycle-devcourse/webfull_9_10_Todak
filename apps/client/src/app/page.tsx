import { redirect } from 'next/navigation';

import { getServerAuthUser } from '@/lib/auth.server';

import HomeLeft from './_components/HomeLeft';
import HomeRight from './_components/HomeRight';

export default async function Home() {
  const user = await getServerAuthUser();

  if (user !== null) {
    redirect(`/projects/join`);
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-16 px-8 py-16 md:grid-cols-[1fr_0.95fr]">
        <HomeLeft />
        <HomeRight />
      </section>
    </main>
  );
}
