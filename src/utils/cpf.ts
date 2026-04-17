import { formatCPF, parseCPF } from '../formatters';
import { randomInt } from './random-int';

export class CPF {
  static generateFormated(): string {
    return CPF.format(CPF.generate());
  }

  static format = formatCPF;

  static removeFormatting = parseCPF;

  static generate(): string {
    const randomDigits = Array.from({ length: 9 }, randomInt).join('');
    for (let digit = 0; digit <= 99; digit++) {
      const verifierDigits = digit.toString().padStart(2, '0');
      if (CPF.isValid(randomDigits + verifierDigits))
        return randomDigits + verifierDigits;
    }
    return randomDigits;
  }

  static isValid(value: string): boolean {
    const digits = CPF.removeFormatting(value);

    let sum = 0;
    let rest: number;

    const ALL_DIGITS_ARE_THE_SAME = digits
      .split('')
      .every(digit => digit === digits[0]);
    if (ALL_DIGITS_ARE_THE_SAME) return false;

    for (let index = 1; index <= 9; index++)
      sum += parseInt(digits.substring(index - 1, index), 10) * (11 - index);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(digits.substring(9, 10), 10)) return false;

    sum = 0;
    for (let index = 1; index <= 10; index++)
      sum += parseInt(digits.substring(index - 1, index), 10) * (12 - index);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(digits.substring(10, 11), 10)) return false;

    return true;
  }
}

