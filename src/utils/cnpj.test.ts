import { describe, expect, test, vi } from 'vitest';
import { CNPJ } from './cnpj';
import * as randomIntModule from './random-int';

describe('CNPJ', () => {
  const validCNPJs = [
    '12345678000195',
    '12ABC34501AB77',
    'AB12CD34EF5602',
    'A1B2C3D4E5F668',
    'ZXCVBN1234QW16',
    '00000000000191',
  ];

  test('delegates formatting helpers', () => {
    expect(CNPJ.format('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
    expect(CNPJ.removeFormatting('12.ABC.345/01DE-35')).toBe(
      '12ABC34501DE35',
    );
  });

  test('validates known valid numeric and alphanumeric CNPJs', () => {
    expect(CNPJ.isValid('11.222.333/0001-81')).toBe(true);
    expect(CNPJ.isValid('12.ABC.345/01DE-35')).toBe(true);
    expect(CNPJ.isValid('12.ABC.345/01AB-77')).toBe(true);
    expect(CNPJ.isValid('12abc34501de35')).toBe(true);
    expect(CNPJ.isValid('12...ABC...345///01AB---77!!!')).toBe(true);
  });

  test('validates fixtures from the reference implementation', () => {
    for (const cnpj of validCNPJs) {
      expect(CNPJ.isValid(cnpj)).toBe(true);
    }
  });

  test('rejects invalid CNPJs', () => {
    expect(CNPJ.isValid('11.222.333/0001-80')).toBe(false);
    expect(CNPJ.isValid('12.ABC.345/01DE-34')).toBe(false);
    expect(CNPJ.isValid('12.ABC.345/01DE-EF')).toBe(false);
    expect(CNPJ.isValid('12ABC34501DEEF35')).toBe(false);
    expect(CNPJ.isValid('12.ABC.345/01DE-35AA')).toBe(false);
    expect(CNPJ.isValid('00000000000000')).toBe(false);
    expect(CNPJ.isValid(null)).toBe(false);
    expect(CNPJ.isValid({})).toBe(false);
  });

  test('rejects check-digit mutations from valid fixtures', () => {
    for (const cnpj of validCNPJs) {
      const penultimate = Number(cnpj[12]);
      const nextPenultimate = Number.isNaN(penultimate)
        ? 0
        : (penultimate + 1) % 10;
      const mutatedPenultimate = `${cnpj.slice(0, 12)}${nextPenultimate}${cnpj[13] ?? '0'}`;
      const last = Number(cnpj.at(-1));
      const nextLast = Number.isNaN(last) ? 0 : (last + 1) % 10;
      const mutatedLast = `${cnpj.slice(0, 13)}${nextLast}`;

      expect(CNPJ.isValid(mutatedPenultimate)).toBe(false);
      expect(CNPJ.isValid(mutatedLast)).toBe(false);
    }
  });

  test('creates a branded CNPJ after validation', () => {
    expect(CNPJ.create('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(CNPJ.create('12.abc.345/01ab-77')).toBe('12ABC34501AB77');
  });

  test('throws when creating an invalid branded CNPJ', () => {
    expect(() => CNPJ.create('12.ABC.345/01DE-34')).toThrow('Invalid CNPJ');
  });

  test('generates a valid alphanumeric CNPJ with 14 characters', () => {
    const generated = CNPJ.generate();

    expect(generated).toMatch(/^[A-Z0-9]{12}\d{2}$/);
    expect(CNPJ.isValid(generated)).toBe(true);
  });

  test('generates a valid numeric CNPJ with 14 digits', () => {
    const generated = CNPJ.generate({ alphanumeric: false });

    expect(generated).toMatch(/^\d{14}$/);
    expect(CNPJ.isValid(generated)).toBe(true);
  });

  test('generates a formatted valid CNPJ', () => {
    const generated = CNPJ.generateFormated();

    expect(generated).toMatch(/^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/);
    expect(CNPJ.isValid(generated)).toBe(true);
  });

  test('uses the alphanumeric alphabet when generating values', () => {
    const randomIntSpy = vi
      .spyOn(randomIntModule, 'randomInt')
      .mockReturnValue(10);

    const generated = CNPJ.generate();

    expect(generated).toMatch(/^A{12}\d{2}$/);

    randomIntSpy.mockRestore();
  });
});
