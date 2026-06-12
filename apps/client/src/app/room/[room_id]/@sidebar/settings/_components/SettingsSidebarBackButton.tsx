'use client';

import { useRouter } from 'next/navigation';

export default function SettingsSidebarBackButton() {
  const router = useRouter();

  return (
    <button
      aria-label="이전 페이지로 이동"
      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-xs font-black text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
      onClick={() => router.back()}
      type="button"
    >
      뒤로가기
    </button>
  );
}
