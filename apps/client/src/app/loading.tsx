import { Spinner } from '@heroui/react';

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <Spinner
        aria-label="페이지를 불러오는 중"
        className="text-accent"
        size="lg"
      />
    </main>
  );
}
