import { clearRepeatedSpaces } from './clear-repeated-spaces';

export const capitalize = (text: string | null = '') =>
  text === null ? '' : text.charAt(0).toUpperCase() + text.slice(1);

export function capitalizeWords(
  text: string | null = '',
  { trim } = { trim: true },
): string {
  if (text === null) return '';
  const cleanSpacesStrign = clearRepeatedSpaces(text);
  const trimmedString = trim ? cleanSpacesStrign.trim() : cleanSpacesStrign;
  return trimmedString.split(' ').map(capitalize).join(' ');
}
