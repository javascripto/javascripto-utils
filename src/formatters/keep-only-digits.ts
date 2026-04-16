import { DIGITS_ONLY_REGEX } from '../constants/regex';
import type { StringInput } from '../types';
import { normalizeStringInput } from '../utils/normalize-string-input';

export function keepOnlyDigits(value: StringInput = ''): string {
  return normalizeStringInput(value).replace(DIGITS_ONLY_REGEX, '');
}
