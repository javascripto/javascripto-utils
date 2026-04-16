import { describe, expect, test } from 'vitest';
import { formatDateBR, formatDateISO8601 } from './format-date';

describe('formatDateBR', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatDateBR('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatDateBR('01a02b2025')).toBe('01/02/2025');
  });

  test('should format dates incrementally in BR format', () => {
    expect(formatDateBR('1')).toBe('1');
    expect(formatDateBR('12')).toBe('12');
    expect(formatDateBR('123')).toBe('12/3');
    expect(formatDateBR('1234')).toBe('12/34');
    expect(formatDateBR('12345')).toBe('12/34/5');
    expect(formatDateBR('123456')).toBe('12/34/56');
    expect(formatDateBR('1234567')).toBe('12/34/567');
    expect(formatDateBR('12345678')).toBe('12/34/5678');
  });

  test('should truncate digits beyond the BR date length', () => {
    expect(formatDateBR('1234567890')).toBe('12/34/5678');
  });
});

describe('formatDateISO8601', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatDateISO8601('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatDateISO8601('2025a01b31')).toBe('2025-01-31');
  });

  test('should format dates incrementally in ISO 8601 format', () => {
    expect(formatDateISO8601('2')).toBe('2');
    expect(formatDateISO8601('20')).toBe('20');
    expect(formatDateISO8601('202')).toBe('202');
    expect(formatDateISO8601('2025')).toBe('2025');
    expect(formatDateISO8601('20250')).toBe('2025-0');
    expect(formatDateISO8601('202501')).toBe('2025-01');
    expect(formatDateISO8601('2025013')).toBe('2025-01-3');
    expect(formatDateISO8601('20250131')).toBe('2025-01-31');
  });

  test('should truncate digits beyond the ISO 8601 date length', () => {
    expect(formatDateISO8601('2025013100')).toBe('2025-01-31');
  });
});
