type ClassValue = false | null | string | undefined;

export function cn(...classNames: ClassValue[]) {
  return classNames.filter(Boolean).join(' ');
}
