import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakToastProps = {
  className?: string;
  icon?: ReactNode;
  message: ReactNode;
  show?: boolean;
};

export function TodakToast({
  className,
  icon = '💡',
  message,
  show = true,
}: TodakToastProps) {
  if (!show) {
    return null;
  }

  return (
    <div className={cn('todak-toast', className)} role="status">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
