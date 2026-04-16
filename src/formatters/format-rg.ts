import { keepOnlyDigits } from './keep-only-digits';

export function formatRG(value = ''): string {
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{1})\d+?$/, '$1');
}

export const parseRG = (value = ''): string => keepOnlyDigits(value);
