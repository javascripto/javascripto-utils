import { clearRepeatedSpaces } from './clear-repeated-spaces';
import type { StringInput } from '../types';
import { normalizeStringInput } from '../utils/normalize-string-input';

export const capitalize = (text: StringInput = '') => {
  const normalizedText = normalizeStringInput(text);
  return normalizedText.charAt(0).toUpperCase() + normalizedText.slice(1);
};

export function capitalizeWords(
  text: StringInput = '',
  { trim } = { trim: true },
): string {
  const cleanSpacesString = clearRepeatedSpaces(text);
  const trimmedString = trim ? cleanSpacesString.trim() : cleanSpacesString;
  return trimmedString.split(' ').map(capitalize).join(' ');
}
