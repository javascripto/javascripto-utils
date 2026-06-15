import type { StringInput } from '../types';
import { normalizeStringInput } from '../utils/normalize-string-input';

export const CNPJ_PLACEHOLDER = 'AA.AAA.AAA/AAAA-00';
export const CNPJ_DIGITS_LENGTH = 14;
export const CNPJ_ALPHANUMERIC_LENGTH = 14;

export function parseCNPJ(value: StringInput = ''): string {
  return normalizeStringInput(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .reduce((cnpj, char) => {
      if (cnpj.length >= CNPJ_ALPHANUMERIC_LENGTH) return cnpj;
      if (cnpj.length < 12) return cnpj + char;
      return /\d/.test(char) ? cnpj + char : cnpj;
    }, '');
}

export function formatCNPJ(value: StringInput = ''): string {
  return parseCNPJ(value)
    .replace(/([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/([A-Z0-9]{3})([A-Z0-9])/, '$1.$2')
    .replace(/([A-Z0-9]{3})([A-Z0-9])/, '$1/$2')
    .replace(/([A-Z0-9]{4})([A-Z0-9])/, '$1-$2')
    .replace(/(-\d{2})[A-Z0-9]+?$/, '$1');
}
