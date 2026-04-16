import { describe, expect, test } from 'vitest';
import { formatPhone, parsePhone } from './format-phone';

describe('formatPhone', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatPhone('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    expect(formatPhone('11a98765b4321')).toBe('(11) 98765-4321');
  });

  test('should format a phone number correctly', () => {
    expect(formatPhone('1')).toBe('1');
    expect(formatPhone('11')).toBe('11');
    expect(formatPhone('119')).toBe('(11) 9');
    expect(formatPhone('1198')).toBe('(11) 98');
    expect(formatPhone('11987')).toBe('(11) 987');
    expect(formatPhone('119876')).toBe('(11) 9876');
    expect(formatPhone('1198765')).toBe('(11) 98765');
    expect(formatPhone('11987654')).toBe('(11) 98765-4');
    expect(formatPhone('119876543')).toBe('(11) 98765-43');
    expect(formatPhone('1198765432')).toBe('(11) 98765-432');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });

  test('should truncate digits beyond the phone length', () => {
    expect(formatPhone('11987654321000')).toBe('(11) 98765-4321');
  });

  test('should parse a phone number correctly', () => {
    expect(parsePhone('(11) 98765-4321')).toBe('11987654321');
    expect(parsePhone('11')).toBe('11');
    expect(parsePhone(null)).toBe('');
    expect(parsePhone(undefined)).toBe('');
  });
});
