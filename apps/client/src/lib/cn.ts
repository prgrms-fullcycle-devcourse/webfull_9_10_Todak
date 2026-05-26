type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassArray = ClassValue[];
type ClassValue =
  | ClassArray
  | ClassDictionary
  | false
  | null
  | string
  | undefined;

export function cn(...classNames: ClassValue[]) {
  return classNames.flatMap(normalizeClassValue).filter(Boolean).join(' ');
}

function normalizeClassValue(className: ClassValue): string[] {
  if (!className) {
    return [];
  }

  if (typeof className === 'string') {
    return [className];
  }

  if (Array.isArray(className)) {
    return className.flatMap(normalizeClassValue);
  }

  return Object.entries(className)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name);
}
