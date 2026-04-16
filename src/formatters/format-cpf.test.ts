import { describe, expect, test } from 'vitest';
import { formatCPF, parseCPF } from './format-cpf';

describe('formatCPF', () => {
  test('should return an empty string if input is empty', () => {
    expect(formatCPF('')).toBe('');
  });

  test('should remove non-digit characters', () => {
    expect(formatCPF('123a456b789c01')).toBe('123.456.789-01');
  });

  test('should format a CPF correctly', () => {
    expect(formatCPF('1')).toBe('1');
    expect(formatCPF('12')).toBe('12');
    expect(formatCPF('123')).toBe('123');
    expect(formatCPF('1234')).toBe('123.4');
    expect(formatCPF('12345')).toBe('123.45');
    expect(formatCPF('123456')).toBe('123.456');
    expect(formatCPF('1234567')).toBe('123.456.7');
    expect(formatCPF('12345678')).toBe('123.456.78');
    expect(formatCPF('123456789')).toBe('123.456.789');
    expect(formatCPF('1234567890')).toBe('123.456.789-0');
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });

  test('should truncate digits beyond the CPF length', () => {
    expect(formatCPF('123456789012345')).toBe('123.456.789-01');
  });

  test('should handle null and undefined values', () => {
    expect(formatCPF(null)).toBe('');
    expect(formatCPF(undefined)).toBe('');
  });

  test('should parse a CPF correctly', () => {
    expect(parseCPF('123.456.789-01')).toBe('12345678901');
    expect(parseCPF('123')).toBe('123');
  });
});
