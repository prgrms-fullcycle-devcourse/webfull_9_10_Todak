'use client';

import RouteFallbackView from '@/app/_components/RouteFallbackView';

interface ChatsErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ChatsError({ error, unstable_retry }: ChatsErrorProps) {
  return (
    <RouteFallbackView
      description="룸 화면은 계속 사용할 수 있습니다. 채팅만 다시 불러와주세요."
      error={error}
      eyebrow="CHAT ERROR"
      onRetry={unstable_retry}
      title="채팅을 불러오지 못했습니다."
      variant="compact"
    />
  );
}
