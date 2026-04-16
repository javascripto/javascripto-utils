import { keepOnlyDigits } from './keep-only-digits';

export function formatCEP(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value.toString())
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

export const parseCEP = (value: string | null = ''): string =>
  value === null ? '' : keepOnlyDigits(value).substring(0, 8);
