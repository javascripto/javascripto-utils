import { keepOnlyDigits } from './keep-only-digits';

export const CNPJ_PLACEHOLDER = '00.000.000/0000-00';
export const CNPJ_DIGITS_LENGTH = 14;

export function formatCNPJ(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export const parseCNPJ = (value = ''): string =>
  keepOnlyDigits(value).substring(0, CNPJ_DIGITS_LENGTH);
