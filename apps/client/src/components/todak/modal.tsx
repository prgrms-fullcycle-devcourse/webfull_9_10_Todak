import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { TodakButton } from './button';

type TodakModalProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  onClose?: () => void;
  open: boolean;
  title?: ReactNode;
};

export function TodakModal({
  children,
  className,
  description,
  onClose,
  open,
  title,
}: TodakModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-todak-fade-in"
      role="presentation"
    >
      <section
        aria-modal="true"
        className={cn(
          'todak-card max-h-[85dvh] w-full max-w-md overflow-hidden',
          className,
        )}
        role="dialog"
      >
        {(title || description || onClose) && (
          <header className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
            <div className="space-y-1">
              {title ? (
                <h2 className="text-sm font-black text-slate-800">{title}</h2>
              ) : null}
              {description ? (
                <p className="text-[10px] leading-relaxed text-gray-400">
                  {description}
                </p>
              ) : null}
            </div>
            {onClose ? (
              <TodakButton
                aria-label="모달 닫기"
                className="text-sm"
                onClick={onClose}
                size="icon"
                variant="soft"
              >
                ×
              </TodakButton>
            ) : null}
          </header>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
