import { Spinner } from '@heroui/react';

export default function Loading() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background text-foreground">
      <Spinner
        aria-label="방을 불러오는 중"
        className="text-accent"
        size="lg"
      />
    </div>
  );
}
