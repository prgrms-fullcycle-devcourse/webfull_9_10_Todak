import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakAvatarSize = 'lg' | 'md' | 'sm';

type TodakAvatarProps = HTMLAttributes<HTMLDivElement> & {
  avatar: ReactNode;
  isOwn?: boolean;
  label?: string;
  size?: TodakAvatarSize;
  status?: ReactNode;
};

const sizeClassName: Record<TodakAvatarSize, string> = {
  lg: 'size-11 text-2xl',
  md: 'size-9 text-lg',
  sm: 'size-7 text-sm',
};

export function TodakAvatar({
  avatar,
  className,
  isOwn = false,
  label,
  size = 'md',
  status,
  ...props
}: TodakAvatarProps) {
  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'todak-avatar relative',
          isOwn && 'todak-avatar-own',
          sizeClassName[size],
        )}
        {...props}
      >
        {avatar}
        {status ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] shadow-sm">
            {status}
          </span>
        ) : null}
      </div>
      {label ? (
        <span
          className={cn(
            'rounded px-1.5 text-[9px] font-bold text-white shadow-sm',
            isOwn ? 'bg-todak-coral-500' : 'bg-slate-800',
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
