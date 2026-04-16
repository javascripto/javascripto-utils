import { keepOnlyDigits } from './keep-only-digits';

export function createCurrencyFormatter(
  locale: Intl.LocalesArgument,
  currency: string,
): (value: number | null) => string {
  const formatter = new Intl.NumberFormat(locale, {
    roundingMode: 'trunc',
    currency: currency,
    style: 'currency',
  });
  return (value: number | null) =>
    value === null ? '' : formatter.format(value);
}

export const formatCurrencyUSD = createCurrencyFormatter('en-US', 'USD');

export const formatCurrencyBRL = createCurrencyFormatter('pt-BR', 'BRL');

export function parseCurrency(currencyString: string): number {
  const value = Number(keepOnlyDigits(currencyString));
  return Number.isNaN(value) ? 0 : value / 100;
}
