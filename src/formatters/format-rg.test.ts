import { describe, expect, test } from 'vitest';
import { formatRG, parseRG } from './format-rg';

describe('formatRG', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatRG('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatRG('12a345b678c9')).toBe('12.345.678-9');
  });

  test('should format an RG correctly', () => {
    expect(formatRG('1')).toBe('1');
    expect(formatRG('12')).toBe('12');
    expect(formatRG('123')).toBe('12.3');
    expect(formatRG('1234')).toBe('12.34');
    expect(formatRG('12345')).toBe('12.345');
    expect(formatRG('123456')).toBe('12.345.6');
    expect(formatRG('1234567')).toBe('12.345.67');
    expect(formatRG('12345678')).toBe('12.345.678');
    expect(formatRG('123456789')).toBe('12.345.678-9');
  });

  test('should truncate digits beyond the RG length', () => {
    expect(formatRG('123456789000')).toBe('12.345.678-9');
  });

  test('should parse an RG correctly', () => {
    expect(parseRG('12.345.678-9')).toBe('123456789');
    expect(parseRG('12')).toBe('12');
    expect(parseRG(null)).toBe('');
    expect(parseRG(undefined)).toBe('');
  });
});
