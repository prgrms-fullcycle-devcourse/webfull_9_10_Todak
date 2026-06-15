'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';

interface RendererErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function RendererError({
  error,
  unstable_retry,
}: RendererErrorProps) {
  return (
    <RouteFallbackView
      description="사이드바와 채팅은 유지됩니다. 룸 화면을 다시 불러와주세요."
      error={error}
      eyebrow="ROOM VIEW ERROR"
      onRetry={unstable_retry}
      title="룸 화면을 표시하지 못했습니다."
      variant="segment"
    />
  );
}
