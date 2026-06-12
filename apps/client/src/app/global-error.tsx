'use client';

import './globals.css';

import RouteFallbackView from './_components/RouteFallbackView';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps) {
  return (
    <html className="todak" data-theme="todak" lang="ko">
      <body>
        <RouteFallbackView
          description="서비스를 표시하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
          error={error}
          eyebrow="APPLICATION ERROR"
          onRetry={unstable_retry}
          title="서비스를 불러오지 못했습니다."
        />
      </body>
    </html>
  );
}
