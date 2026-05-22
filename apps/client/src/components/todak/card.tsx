import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakCardTone = 'card' | 'panel';

type TodakCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: TodakCardTone;
};

type TodakCardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  description?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
};

export function TodakCard({
  className,
  tone = 'card',
  ...props
}: TodakCardProps) {
  return (
    <div
      className={cn(tone === 'card' ? 'todak-card' : 'todak-panel', className)}
      {...props}
    />
  );
}

export function TodakCardHeader({
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: TodakCardHeaderProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {eyebrow ? <p className="todak-section-label">{eyebrow}</p> : null}
      {title ? <h2 className="todak-title">{title}</h2> : null}
      {description ? <p className="todak-subcopy">{description}</p> : null}
      {children}
    </div>
  );
}
