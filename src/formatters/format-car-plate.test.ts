import { describe, expect, test } from 'vitest';
import {
  convertOldCarPlateToMercosul,
  formatCarPlate,
  parseCarPlate,
} from './format-car-plate';

describe('formatCarPlate', () => {
  test('should format car plate in AAA-0000 format', () => {
    expect(formatCarPlate('a')).toBe('A');
    expect(formatCarPlate('aa')).toBe('AA');
    expect(formatCarPlate('aaa')).toBe('AAA');
    expect(formatCarPlate('aaa0')).toBe('AAA-0');
    expect(formatCarPlate('aaa00')).toBe('AAA-00');
    expect(formatCarPlate('aaa000')).toBe('AAA-000');
    expect(formatCarPlate('aaa0000')).toBe('AAA-0000');
    expect(formatCarPlate('aaa0000a')).toBe('AAA-0000');
  });

  test('should format car plate in AAA0A00 (mercosul) format', () => {
    expect(formatCarPlate('a')).toBe('A');
    expect(formatCarPlate('aa')).toBe('AA');
    expect(formatCarPlate('aaa')).toBe('AAA');
    expect(formatCarPlate('aaa0')).toBe('AAA-0');
    expect(formatCarPlate('aaa0a')).toBe('AAA0A');
    expect(formatCarPlate('aaa0a0')).toBe('AAA0A0');
    expect(formatCarPlate('aaa0a00')).toBe('AAA0A00');
    expect(formatCarPlate('aaa0aaa')).toBe('AAA0A');
    expect(formatCarPlate('aaa0a00aaa')).toBe('AAA0A00');
  });

  test('should keep partial mercosul suffix when old format does not apply', () => {
    expect(formatCarPlate('abca1')).toBe('ABCA');
    expect(formatCarPlate('abc1b')).toBe('ABC1B');
  });
});

describe('parseCarPlate', () => {
  test('should normalize to uppercase alphanumeric and truncate to 7 chars', () => {
    expect(parseCarPlate('abc-1234')).toBe('ABC1234');
    expect(parseCarPlate('abc1d23xyz')).toBe('ABC1D23');
  });
});

describe('convertOldCarPlateToMercosul', () => {
  test('should convert a valid old plate to mercosul pattern', () => {
    expect(convertOldCarPlateToMercosul('abc-1234')).toBe('ABC-1C34');
  });

  test('should return original input when plate is not in old pattern', () => {
    expect(convertOldCarPlateToMercosul('AB1234')).toBe('AB1234');
    expect(convertOldCarPlateToMercosul('ABC1D23')).toBe('ABC1D23');
  });
});
