import { keepOnlyDigits } from './keep-only-digits';

export const DATE_FORMAT_BR = 'dd/MM/yyyy';
export const DATE_PLACEHOLDER_BR = 'dd/mm/yyyy';
export const DATE_TIME_FORMAT_BR = 'dd/MM/yyyy\u00A0HH:mm';

export const DATE_FORMAT_US = 'MM/dd/yyyy';
export const DATE_PLACEHOLDER_US = 'mm/dd/yyyy';
export const DATE_TIME_FORMAT_US = 'MM/dd/yyyy\u00A0HH:mm';

export const DATE_FORMAT_ISO_8601 = 'yyyy-MM-dd';
export const DATE_PLACEHOLDER_ISO_8601 = 'yyyy-mm-dd';
export const DATE_TIME_FORMAT_ISO_8601 = 'yyyy-MM-dd\u00A0HH:mm';

export function formatDateBR(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{4})\d+?$/, '$1');
}

export function formatDateISO8601(value: string | null = ''): string {
  if (value === null) return '';
  return keepOnlyDigits(value)
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(\d{2})(\d)/, '$1-$2')
    .replace(/(\d{2})\d+?$/, '$1');
}
