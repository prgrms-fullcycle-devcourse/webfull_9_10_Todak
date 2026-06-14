'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';

interface JoinErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function JoinError({ error, unstable_retry }: JoinErrorProps) {
  return (
    <RouteFallbackView
      description="참여 중인 룸 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
      error={error}
      eyebrow="PROJECT HUB ERROR"
      onRetry={unstable_retry}
      title="프로젝트 허브를 열지 못했습니다."
    />
  );
}
