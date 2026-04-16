import { DIGITS_ONLY_REGEX } from '../constants/regex';

export function keepOnlyDigits(value: string | null = ''): string {
  return value === null ? '' : value.replace(DIGITS_ONLY_REGEX, '');
}
