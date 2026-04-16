import type { NumberInput, StringInput } from '../types';
import { isNullOrUndefined } from '../utils/is-null-or-undefined';
import { keepOnlyDigits } from './keep-only-digits';

export function createCurrencyFormatter(
  locale: Intl.LocalesArgument,
  currency: string,
): (value: NumberInput) => string {
  const formatter = new Intl.NumberFormat(locale, {
    roundingMode: 'trunc',
    currency: currency,
    style: 'currency',
  });
  return (value: NumberInput) =>
    isNullOrUndefined(value) ? '' : formatter.format(value);
}

export const formatCurrencyUSD = createCurrencyFormatter('en-US', 'USD');

export const formatCurrencyBRL = createCurrencyFormatter('pt-BR', 'BRL');

export function parseCurrency(currencyString: StringInput = ''): number {
  const value = Number(keepOnlyDigits(currencyString));
  return Number.isNaN(value) ? 0 : value / 100;
}
