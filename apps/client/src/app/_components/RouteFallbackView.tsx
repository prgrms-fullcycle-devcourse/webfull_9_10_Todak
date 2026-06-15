'use client';

import { cn } from '@/lib/cn';
import { Button } from '@heroui/react';
import { useEffect } from 'react';

type RouteFallbackVariant = 'page' | 'segment' | 'compact';

interface RouteFallbackViewProps {
  description: string;
  error?: Error & { digest?: string };
  eyebrow?: string;
  onRetry?: () => void;
  title: string;
  variant?: RouteFallbackVariant;
}

export default function RouteFallbackView({
  description,
  error,
  eyebrow = 'SOMETHING WENT WRONG',
  onRetry,
  title,
  variant = 'page',
}: RouteFallbackViewProps) {
  useEffect(() => {
    if (error !== undefined) {
      console.error('[route-error]', error);
    }
  }, [error]);

  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center bg-background text-foreground',
        variant === 'page' && 'min-h-dvh px-5 py-10',
        variant === 'segment' && 'h-full min-h-0 px-5 py-6',
        isCompact && 'h-full min-h-0 bg-transparent px-1 py-4',
      )}
      role="alert"
    >
      <section
        className={cn(
          'w-full rounded-[26px] border border-border/80 bg-surface text-center shadow-todak-panel',
          isCompact ? 'max-w-[300px] px-4 py-5' : 'max-w-[430px] px-7 py-8',
        )}
      >
        <p className="todak-section-label text-todak-coral-500">{eyebrow}</p>
        <h1
          className={cn(
            'todak-title mt-2 leading-tight',
            isCompact ? 'text-[16px]' : 'text-[22px]',
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            'todak-subcopy mt-2 font-bold leading-relaxed',
            isCompact ? 'text-[10px]' : 'text-[11px]',
          )}
        >
          {description}
        </p>

        {error?.digest !== undefined && (
          <p className="mt-3 font-todak-mono text-[9px] font-bold text-muted">
            오류 코드: {error.digest}
          </p>
        )}

        <div className="mt-5 flex justify-center gap-2">
          <Button
            className="h-9 rounded-xl bg-surface-secondary px-4 text-xs font-black text-muted"
            onPress={() => window.location.assign('/')}
            type="button"
            variant="ghost"
          >
            홈으로
          </Button>
          {onRetry !== undefined && (
            <Button
              className="h-9 rounded-xl bg-foreground px-4 text-xs font-black text-background shadow-sm hover:bg-slate-800"
              onPress={onRetry}
              type="button"
            >
              다시 시도
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
