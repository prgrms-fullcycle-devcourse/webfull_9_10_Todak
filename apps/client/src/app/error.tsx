'use client';

import RouteFallbackView from './_components/RouteFallbackView';

interface RootErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function RootError({ error, unstable_retry }: RootErrorProps) {
  return (
    <RouteFallbackView
      description="페이지를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 홈으로 이동해주세요."
      error={error}
      onRetry={unstable_retry}
      title="페이지를 불러오지 못했습니다."
    />
  );
}
