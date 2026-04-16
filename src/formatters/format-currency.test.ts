import { describe, expect, test } from 'vitest';
import {
  formatCurrencyBRL,
  formatCurrencyUSD,
  parseCurrency,
} from './format-currency';

describe('formatCurrency', () => {
  test('should format BRL currency with truncation', () => {
    expect(formatCurrencyBRL(1234.567)).toBe('R$\u00A01.234,56');
  });

  test('should format USD currency with truncation', () => {
    expect(formatCurrencyUSD(1234.567)).toBe('$1,234.56');
  });

  test('should parse BRL and USD strings into numbers', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  test('should return zero when currency string has no digits', () => {
    expect(parseCurrency('abc')).toBe(0);
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency(null)).toBe(0);
    expect(parseCurrency(undefined)).toBe(0);
  });

  test('should return an empty string for null and undefined numeric inputs', () => {
    expect(formatCurrencyBRL(null)).toBe('');
    expect(formatCurrencyBRL(undefined)).toBe('');
    expect(formatCurrencyUSD(null)).toBe('');
    expect(formatCurrencyUSD(undefined)).toBe('');
  });
});
