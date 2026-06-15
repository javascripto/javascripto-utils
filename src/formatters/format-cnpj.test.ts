import { describe, expect, test } from 'vitest';
import { formatCNPJ, parseCNPJ } from './format-cnpj';

describe('formatCNPJ', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatCNPJ('')).toBe('');
  });

  test('should remove invalid characters', () => {
    expect(formatCNPJ('12!345@678#0001$95')).toBe('12.345.678/0001-95');
  });

  test('should format an alphanumeric CNPJ correctly', () => {
    expect(formatCNPJ('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
    expect(formatCNPJ('12.abc.345/01de-35')).toBe('12.ABC.345/01DE-35');
  });

  test('should format a CNPJ correctly', () => {
    expect(formatCNPJ('1')).toBe('1');
    expect(formatCNPJ('12')).toBe('12');
    expect(formatCNPJ('123')).toBe('12.3');
    expect(formatCNPJ('1234')).toBe('12.34');
    expect(formatCNPJ('12345')).toBe('12.345');
    expect(formatCNPJ('123456')).toBe('12.345.6');
    expect(formatCNPJ('1234567')).toBe('12.345.67');
    expect(formatCNPJ('12345678')).toBe('12.345.678');
    expect(formatCNPJ('123456789')).toBe('12.345.678/9');
    expect(formatCNPJ('1234567890')).toBe('12.345.678/90');
    expect(formatCNPJ('12345678901')).toBe('12.345.678/901');
    expect(formatCNPJ('123456789012')).toBe('12.345.678/9012');
    expect(formatCNPJ('1234567890123')).toBe('12.345.678/9012-3');
    expect(formatCNPJ('12345678901234')).toBe('12.345.678/9012-34');
  });

  test('should truncate digits beyond the CNPJ length', () => {
    expect(formatCNPJ('12345678901234567890')).toBe('12.345.678/9012-34');
  });

  test('should handle null and undefined values', () => {
    expect(formatCNPJ(null)).toBe('');
    expect(formatCNPJ(undefined)).toBe('');
  });

  test('should parse a CNPJ correctly', () => {
    expect(parseCNPJ('12.345.678/0001-95')).toBe('12345678000195');
    expect(parseCNPJ('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(parseCNPJ(null)).toBe('');
    expect(parseCNPJ(undefined)).toBe('');
  });

  test('should keep letters only before the verifier digits', () => {
    expect(parseCNPJ('12.ABC.345/01DE-EF35')).toBe('12ABC34501DE35');
    expect(formatCNPJ('12ABC34501DEEF35')).toBe('12.ABC.345/01DE-35');
  });
});
