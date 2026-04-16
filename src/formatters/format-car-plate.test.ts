import { describe, expect, test } from 'vitest';
import { formatCarPlate } from './format-car-plate';

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
});
