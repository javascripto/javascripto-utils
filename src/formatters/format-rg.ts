import type { StringInput } from '../types';
import { keepOnlyDigits } from './keep-only-digits';

export const RG_DIGITS_LENGTH = 9;

export function formatRG(value: StringInput = ''): string {
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{1})\d+?$/, '$1');
}

export const parseRG = (value: StringInput = ''): string =>
  keepOnlyDigits(value).substring(0, RG_DIGITS_LENGTH);
