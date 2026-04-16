import type { StringInput } from '../types';
import { keepOnlyDigits } from './keep-only-digits';

export const PHONE_DIGITS_LENGTH = 11;

export function formatPhone(value: StringInput = ''): string {
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

export const parsePhone = (value: StringInput = ''): string =>
  keepOnlyDigits(value).substring(0, PHONE_DIGITS_LENGTH);
