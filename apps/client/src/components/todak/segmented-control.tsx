import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakSegmentedControlItem<TValue extends string> = {
  icon?: ReactNode;
  label: ReactNode;
  value: TValue;
};

type TodakSegmentedControlProps<TValue extends string> = {
  ariaLabel: string;
  className?: string;
  items: TodakSegmentedControlItem<TValue>[];
  onValueChange: (value: TValue) => void;
  value: TValue;
};

export function TodakSegmentedControl<TValue extends string>({
  ariaLabel,
  className,
  items,
  onValueChange,
  value,
}: TodakSegmentedControlProps<TValue>) {
  return (
    <div aria-label={ariaLabel} className={cn('todak-segment', className)}>
      {items.map(item => (
        <button
          aria-pressed={item.value === value}
          className={cn(
            'todak-segment-item',
            item.value === value && 'todak-segment-item-active',
          )}
          key={item.value}
          onClick={() => onValueChange(item.value)}
          type="button"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {item.icon}
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
