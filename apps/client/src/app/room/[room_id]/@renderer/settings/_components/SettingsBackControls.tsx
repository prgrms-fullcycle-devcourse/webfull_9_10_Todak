'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsBackControls() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs font-black text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
      onClick={() => router.back()}
      type="button"
    >
      뒤로가기
    </button>
  );
}
