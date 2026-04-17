import { describe, expect, test } from 'vitest';
import { randomInt } from './random-int';

describe('randomInt', () => {
  test('returns number within default range 0-9', () => {
    for (let i = 0; i < 1000; i++) {
      const int = randomInt();
      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(0);
      expect(int).toBeLessThanOrEqual(9);
    }
  });

  test('returns number within provided range inclusive', () => {
    const min = -5;
    const max = 5;
    for (let i = 0; i < 1000; i++) {
      const int = randomInt({ min, max });
      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(min);
      expect(int).toBeLessThanOrEqual(max);
    }
  });

  test('should throw error if min is greater than max', () => {
    expect(() => randomInt({ min: 5, max: 3 })).toThrow(
      'min should be less than or equal to max',
    );
  });

  test('min equals max returns that value', () => {
    expect(randomInt({ min: 3, max: 3 })).toBe(3);
  });
});
