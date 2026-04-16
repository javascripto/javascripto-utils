import type { StringInput } from '../types';
import { keepOnlyDigits } from './keep-only-digits';

export const CEP_DIGITS_LENGTH = 8;

export function formatCEP(value: StringInput = ''): string {
  return keepOnlyDigits(value)
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

export const parseCEP = (value: StringInput = ''): string =>
  keepOnlyDigits(value).substring(0, CEP_DIGITS_LENGTH);
