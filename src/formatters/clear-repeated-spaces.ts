import { REPEATED_SPACES_REGEX } from '../constants/regex';

export const clearRepeatedSpaces = (text: string | null = '') =>
  text === null ? '' : text.replace(REPEATED_SPACES_REGEX, ' ');
