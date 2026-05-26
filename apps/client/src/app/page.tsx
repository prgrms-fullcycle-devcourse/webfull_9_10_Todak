import HomeLeft from './_components/HomeLeft';
import HomeRight from './_components/HomeRight';

export default async function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-16 px-8 py-16 md:grid-cols-[1fr_0.95fr]">
        <HomeLeft />
        <HomeRight />
      </section>
    </main>
  );
}
