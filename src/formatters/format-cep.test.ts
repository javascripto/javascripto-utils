import { describe, expect, test } from 'vitest';
import { formatCEP, parseCEP } from './format-cep';

describe('formatCEP', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatCEP('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatCEP('12a3456b78')).toBe('12345-678');
    expect(formatCEP('abc12345def6789ghi')).toBe('12345-678');
  });

  test('should format a CEP correctly', () => {
    expect(formatCEP('1')).toBe('1');
    expect(formatCEP('12')).toBe('12');
    expect(formatCEP('123')).toBe('123');
    expect(formatCEP('1234')).toBe('1234');
    expect(formatCEP('12345')).toBe('12345');
    expect(formatCEP('123456')).toBe('12345-6');
    expect(formatCEP('1234567')).toBe('12345-67');
    expect(formatCEP('12345678')).toBe('12345-678');
  });

  test('should not add digits if there are more than 8 digits', () => {
    expect(formatCEP('1234567890')).toBe('12345-678');
  });

  test('should handle null and undefined values', () => {
    expect(formatCEP(null)).toBe('');
    expect(formatCEP(undefined)).toBe('');
  });

  test('should handle non-string values', () => {
    // @ts-expect-error
    expect(formatCEP(12345678)).toBe('12345-678');
    // @ts-expect-error
    expect(formatCEP(true)).toBe('');
    // @ts-expect-error
    expect(formatCEP(false)).toBe('');
    // @ts-expect-error
    expect(formatCEP([])).toBe('');
    // @ts-expect-error
    expect(formatCEP({})).toBe('');
    // @ts-expect-error
    expect(formatCEP(() => {})).toBe('');
  });

  test('should parse a CEP correctly', () => {
    expect(parseCEP('12345-678')).toBe('12345678');
    expect(parseCEP('12345')).toBe('12345');
  });
});
