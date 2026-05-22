import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

type TodakFieldProps = LabelHTMLAttributes<HTMLLabelElement> & {
  hint?: string;
  label: string;
};

export function TodakField({
  children,
  className,
  hint,
  label,
  ...props
}: TodakFieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)} {...props}>
      <span className="text-xs font-bold text-gray-600">{label}</span>
      {children}
      {hint ? (
        <span className="block text-[10px] text-gray-400">{hint}</span>
      ) : null}
    </label>
  );
}

export function TodakInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('todak-input', className)} {...props} />;
}

export function TodakSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('todak-select', className)} {...props} />;
}

export function TodakTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'todak-input min-h-32 resize-none leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}
