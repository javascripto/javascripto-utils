import { REPEATED_SPACES_REGEX } from '../constants';
import type { StringInput } from '../types';
import { normalizeStringInput } from '../utils/normalize-string-input';

export const clearRepeatedSpaces = (text: StringInput = '') =>
  normalizeStringInput(text).replace(REPEATED_SPACES_REGEX, ' ');
