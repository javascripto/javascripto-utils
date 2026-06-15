import { formatCNPJ, parseCNPJ } from '../formatters';
import { randomInt } from './random-int';

declare const VALID_CNPJ_BRAND: unique symbol;

export type ValidCNPJ = string & { readonly [VALID_CNPJ_BRAND]: 'ValidCNPJ' };

const CNPJ_BASE_LENGTH = 12;
const CNPJ_LENGTH = 14;
const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const NUMERIC_CHARS = '0123456789';
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ASCII_CODE_ZERO = '0'.charCodeAt(0);

type GenerateCNPJArgs = {
  alphanumeric?: boolean;
};

function charToCNPJValue(char: string): number {
  return char.charCodeAt(0) - ASCII_CODE_ZERO;
}

function normalizeCNPJ(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function calculateVerifierDigit(value: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + charToCNPJValue(value.charAt(index)) * weight,
    0,
  );
  const digit = 11 - (sum % 11);

  return digit >= 10 ? 0 : digit;
}

function hasRepeatedChars(value: string): boolean {
  return value.split('').every(char => char === value.charAt(0));
}

function randomChar(chars: string): string {
  return chars.charAt(randomInt({ min: 0, max: chars.length - 1 }));
}

export class CNPJ {
  static generateFormated(args: GenerateCNPJArgs = {}): string {
    return CNPJ.format(CNPJ.generate(args));
  }

  static format = formatCNPJ;

  static removeFormatting = parseCNPJ;

  static create(value: unknown): ValidCNPJ {
    if (!CNPJ.isValid(value)) throw new Error('Invalid CNPJ');
    return normalizeCNPJ(value as string) as ValidCNPJ;
  }

  static generate({ alphanumeric = true }: GenerateCNPJArgs = {}): string {
    const chars = alphanumeric ? ALPHANUMERIC_CHARS : NUMERIC_CHARS;
    const base = Array.from({ length: CNPJ_BASE_LENGTH }, () =>
      randomChar(chars),
    ).join('');
    const firstDigit = calculateVerifierDigit(base, FIRST_DIGIT_WEIGHTS);
    const secondDigit = calculateVerifierDigit(
      base + firstDigit,
      SECOND_DIGIT_WEIGHTS,
    );

    return `${base}${firstDigit}${secondDigit}`;
  }

  static isValid(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const cnpj = normalizeCNPJ(value);

    if (cnpj.length !== CNPJ_LENGTH) return false;
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return false;
    if (hasRepeatedChars(cnpj)) return false;

    const base = cnpj.substring(0, CNPJ_BASE_LENGTH);
    const firstDigit = calculateVerifierDigit(base, FIRST_DIGIT_WEIGHTS);
    const secondDigit = calculateVerifierDigit(
      base + firstDigit,
      SECOND_DIGIT_WEIGHTS,
    );

    return cnpj.endsWith(`${firstDigit}${secondDigit}`);
  }
}
