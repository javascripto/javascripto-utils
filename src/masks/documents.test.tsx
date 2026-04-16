/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import { carPlateMask, cnpjMask, cpfMask, rgMask } from './documents';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';

afterEach(() => {
  cleanupDom();
});

describe('document masks', () => {
  test('should build RG mask while typing', async () => {
    const input = renderMaskedInput('rg', rgMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '123456789');

    expect(snapshots).toEqual([
      '1',
      '12',
      '12.3',
      '12.34',
      '12.345',
      '12.345.6',
      '12.345.67',
      '12.345.678',
      '12.345.678-9',
    ]);
  });

  test('should build CPF mask while typing', async () => {
    const input = renderMaskedInput('cpf', cpfMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '12345678901');

    expect(snapshots).toEqual([
      '1',
      '12',
      '123',
      '123.4',
      '123.45',
      '123.456',
      '123.456.7',
      '123.456.78',
      '123.456.789',
      '123.456.789-0',
      '123.456.789-01',
    ]);
  });

  test('should build CNPJ mask while typing', async () => {
    const input = renderMaskedInput('cnpj', cnpjMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '12345678000195');

    expect(snapshots).toEqual([
      '1',
      '12',
      '12.3',
      '12.34',
      '12.345',
      '12.345.6',
      '12.345.67',
      '12.345.678',
      '12.345.678/0',
      '12.345.678/00',
      '12.345.678/000',
      '12.345.678/0001',
      '12.345.678/0001-9',
      '12.345.678/0001-95',
    ]);
  });

  test('should build car plate mask while typing', async () => {
    const input = renderMaskedInput('plate', carPlateMask);

    const { snapshots } = await typeAndCollectSnapshots(input, 'aaa0a00');

    expect(snapshots).toEqual([
      'A',
      'AA',
      'AAA',
      'AAA-0',
      'AAA0A',
      'AAA0A0',
      'AAA0A00',
    ]);
  });

  test('should support arrow navigation and backspace for CPF', async () => {
    const input = renderMaskedInput('cpf', cpfMask);
    const { user } = await typeAndCollectSnapshots(input, '12345678901');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{Backspace}');

    expect(input.value).toBe('123.456.780-1');
    expect(input.selectionStart).toBe(10);
  });
});
