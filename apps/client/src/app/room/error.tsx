'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';

interface RoomErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function RoomError({ error, unstable_retry }: RoomErrorProps) {
  return (
    <RouteFallbackView
      description="룸 정보를 불러오는 중 문제가 발생했습니다. 다시 연결을 시도해주세요."
      error={error}
      eyebrow="ROOM ERROR"
      onRetry={unstable_retry}
      title="룸에 입장하지 못했습니다."
    />
  );
}
