import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakChipTone = 'coral' | 'neutral';

type TodakChipProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  tone?: TodakChipTone;
};

export function TodakChip({
  children,
  className,
  icon,
  tone = 'neutral',
  ...props
}: TodakChipProps) {
  return (
    <span
      className={cn(
        tone === 'coral' ? 'todak-chip-coral' : 'todak-chip',
        className,
      )}
      {...props}
    >
      {icon ? <span className="mr-1">{icon}</span> : null}
      {children}
    </span>
  );
}
