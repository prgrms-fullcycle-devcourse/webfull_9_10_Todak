import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type TodakButtonVariant = 'dark' | 'primary' | 'soft';
type TodakButtonSize = 'icon' | 'md' | 'sm';

type TodakButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  size?: TodakButtonSize;
  variant?: TodakButtonVariant;
};

const variantClassName: Record<TodakButtonVariant, string> = {
  dark: 'todak-button-dark',
  primary: 'todak-button-primary',
  soft: 'todak-button-soft',
};

const sizeClassName: Record<TodakButtonSize, string> = {
  icon: 'size-9 p-0',
  md: '',
  sm: 'rounded-lg px-3 py-1.5 text-[11px]',
};

export function TodakButton({
  children,
  className,
  icon,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: TodakButtonProps) {
  return (
    <button
      className={cn(variantClassName[variant], sizeClassName[size], className)}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
