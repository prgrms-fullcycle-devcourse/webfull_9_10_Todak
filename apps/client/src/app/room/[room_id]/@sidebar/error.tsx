'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';

interface SidebarErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function SidebarError({
  error,
  unstable_retry,
}: SidebarErrorProps) {
  return (
    <RouteFallbackView
      description="룸 화면은 계속 사용할 수 있습니다. 사이드바만 다시 불러와주세요."
      error={error}
      eyebrow="SIDEBAR ERROR"
      onRetry={unstable_retry}
      title="사이드바를 불러오지 못했습니다."
      variant="compact"
    />
  );
}
