import { keepOnlyDigits } from './keep-only-digits';

export function formatPhone(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

export const parsePhone = (value = ''): string => keepOnlyDigits(value);
