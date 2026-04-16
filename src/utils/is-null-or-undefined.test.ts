import { describe, expect, test } from 'vitest';
import { isNullOrUndefined } from './is-null-or-undefined';

describe('isNullOrUndefined', () => {
  test('should return true for null', () => {
    expect(isNullOrUndefined(null)).toBe(true);
  });

  test('should return true for undefined', () => {
    expect(isNullOrUndefined(undefined)).toBe(true);
  });

  test('should return false for other values', () => {
    expect(isNullOrUndefined(0)).toBe(false);
    expect(isNullOrUndefined('')).toBe(false);
    expect(isNullOrUndefined(false)).toBe(false);
    expect(isNullOrUndefined([])).toBe(false);
    expect(isNullOrUndefined({})).toBe(false);
  });
});
