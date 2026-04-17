import { describe, expect, test } from 'vitest';
import { CPF } from './cpf';

describe('CPF', () => {
  test('delegates formatting helpers', () => {
    expect(CPF.format('52998224725')).toBe('529.982.247-25');
    expect(CPF.removeFormatting('529.982.247-25')).toBe('52998224725');
  });

  test('validates a known valid CPF with and without formatting', () => {
    expect(CPF.isValid('52998224725')).toBe(true);
    expect(CPF.isValid('529.982.247-25')).toBe(true);
  });

  test('rejects CPFs with repeated digits', () => {
    expect(CPF.isValid('00000000000')).toBe(false);
    expect(CPF.isValid('111.111.111-11')).toBe(false);
  });

  test('rejects CPF with invalid verifier digits', () => {
    expect(CPF.isValid('52998224724')).toBe(false);
    expect(CPF.isValid('529.982.247-24')).toBe(false);
  });

  test('generates a valid CPF with 11 digits', () => {
    const generated = CPF.generate();

    expect(generated).toMatch(/^\d{11}$/);
    expect(CPF.isValid(generated)).toBe(true);
  });

  test('generates a formatted valid CPF', () => {
    const generated = CPF.generateFormated();

    expect(generated).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    expect(CPF.isValid(generated)).toBe(true);
  });
});
