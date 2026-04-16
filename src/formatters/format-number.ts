import { isNullOrUndefined } from '../utils/is-null-or-undefined';

export function createTruncateNumberFormatter(locale: Intl.LocalesArgument) {
  return (value = 0, decimals = 2) =>
    value.toLocaleString(locale, {
      roundingMode: 'trunc',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
}

export const truncateNumberBR = createTruncateNumberFormatter('pt-BR');

export const truncateNumberUS = createTruncateNumberFormatter('en-US');

export const formatNumberBR = (number?: number, decimals = 2) =>
  isNullOrUndefined(number) ? '' : truncateNumberBR(number, decimals);

export const formatNumberUS = (number?: number, decimals = 2) =>
  isNullOrUndefined(number) ? '' : truncateNumberUS(number, decimals);
