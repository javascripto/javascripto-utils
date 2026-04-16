import { describe, expect, test } from 'vitest';
import {
  formatNumberBR,
  formatNumberUS,
  truncateNumberBR,
  truncateNumberUS,
} from './format-number';

describe('truncateNumberBR', () => {
  test('should format numbers in pt-BR with truncation', () => {
    expect(truncateNumberBR(1234.567, 2)).toBe('1.234,56');
  });

  test('should support custom decimal places', () => {
    expect(truncateNumberBR(1234.567, 0)).toBe('1.234');
    expect(truncateNumberBR(1234.567, 3)).toBe('1.234,567');
    expect(truncateNumberBR(1.234567, 8)).toBe('1,23456700');
  });
});

describe('truncateNumberUS', () => {
  test('should format numbers in en-US with truncation', () => {
    expect(truncateNumberUS(1234.567, 2)).toBe('1,234.56');
  });

  test('should support custom decimal places', () => {
    expect(truncateNumberUS(1234.567, 0)).toBe('1,234');
    expect(truncateNumberUS(1234.567, 3)).toBe('1,234.567');
    expect(truncateNumberUS(1.234567, 8)).toBe('1.23456700');
  });
});

describe('formatNumber', () => {
  test('should return an empty string for null and undefined', () => {
    expect(formatNumberBR(null)).toBe('');
    expect(formatNumberBR(undefined)).toBe('');
    expect(formatNumberUS(null)).toBe('');
    expect(formatNumberUS(undefined)).toBe('');
  });

  test('should delegate to the locale formatters', () => {
    expect(formatNumberBR(1234.567, 2)).toBe('1.234,56');
    expect(formatNumberUS(1234.567, 2)).toBe('1,234.56');
    expect(formatNumberBR(1.23456789, 8)).toBe('1,23456789');
    expect(formatNumberUS(1.23456789, 8)).toBe('1.23456789');

  });
});
