import { formatDateBR, formatDateISO8601, keepOnlyDigits } from '../formatters';
import { createMask } from './create-mask';

export const dateISO8601Mask = createMask({
  parse: keepOnlyDigits,
  format: formatDateISO8601,
});

export const dateBRMask = createMask({
  parse: keepOnlyDigits,
  format: formatDateBR,
});

export const isDateStringValid = (value: `${string}-${string}-${string}`) => {
  return new Date(value).toJSON()?.substring(0, 10) === value;
};

export const parseISO8601Date = (value: string): string => {
  const digits = keepOnlyDigits(value);
  if (digits.length !== 8) return '';
  const year = digits.substring(0, 4);
  const month = digits.substring(4, 6);
  const day = digits.substring(6, 8);
  if (!isDateStringValid(`${year}-${month}-${day}`)) return 'Invalid date';
  return `${year}-${month}-${day}`;
};

export const parseDateBR = (value: string): string => {
  const digits = keepOnlyDigits(value);
  if (digits.length !== 8) return '';
  const day = digits.substring(0, 2);
  const month = digits.substring(2, 4);
  const year = digits.substring(4, 8);
  if (!isDateStringValid(`${year}-${month}-${day}`)) return 'Invalid date';
  return `${year}-${month}-${day}`;
};
