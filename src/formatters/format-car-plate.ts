import type { StringInput } from '../types';
import { isNullOrUndefined, normalizeStringInput } from '../utils';

export const CAR_PLATE_OLD_PLACEHOLDER = 'AAA-0000';
export const CAR_PLATE_MERCOSUL_PLACEHOLDER = 'AAA0A00';

export function convertOldCarPlateToMercosul(plate: StringInput): string {
  const normalizedPlate = normalizeStringInput(plate).toUpperCase();
  if (!/[A-Z]{3}-\d{4}/.test(normalizedPlate)) return plate as string;
  const charAtPosition5 = Number(normalizedPlate.charAt(5).toUpperCase());
  const letterCharAtPosition5 = String.fromCharCode(charAtPosition5 + 65);
  return (
    normalizedPlate.slice(0, 5) +
    letterCharAtPosition5 +
    normalizedPlate.slice(6)
  );
}

export function formatCarPlate(value: StringInput): string {
  const normalizedValue = parseCarPlate(value);

  const letters = normalizedValue.slice(0, 3).replace(/[^A-Z]/g, '');
  const suffix = normalizedValue.slice(3);

  if (letters.length < 3) return letters;

  const oldPatternDigits = suffix.replace(/\D/g, '').slice(0, 4);
  const mercosulMatch = suffix.match(/^(\d)([A-J])(\d{0,2})/);

  if (mercosulMatch) {
    const [, firstDigit, middleLetter, lastDigits] = mercosulMatch;
    return `${letters}${firstDigit}${middleLetter}${lastDigits}`;
  }

  if (suffix.startsWith(oldPatternDigits)) {
    return oldPatternDigits === '' ? letters : `${letters}-${oldPatternDigits}`;
  }

  const partialMercosul = suffix.match(/^(\d?[A-J]?)/)?.[0] ?? '';
  return `${letters}${partialMercosul}`;
}

export function parseCarPlate(value: StringInput): string {
  return normalizeStringInput(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}
