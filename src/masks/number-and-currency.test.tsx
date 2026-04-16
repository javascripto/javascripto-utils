/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import {
  currencyBRLMask,
  currencyBTCMask,
  currencyUSDMask,
  numberMask,
  percentageMask,
} from './number-and-currency';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';

afterEach(() => {
  cleanupDom();
});

describe('number and currency masks', () => {
  test('should build BRL currency while typing', async () => {
    const input = renderMaskedInput('currency-brl', currencyBRLMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '123456');

    expect(snapshots).toEqual([
      'R$ 0,01',
      'R$ 0,12',
      'R$ 1,23',
      'R$ 12,34',
      'R$ 123,45',
      'R$ 1.234,56',
    ]);
  });

  test('should build USD currency while typing', async () => {
    const input = renderMaskedInput('currency-usd', currencyUSDMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '123456');

    expect(snapshots).toEqual([
      '$0.01',
      '$0.12',
      '$1.23',
      '$12.34',
      '$123.45',
      '$1,234.56',
    ]);
  });

  test('should build BTC currency while typing', async () => {
    const input = renderMaskedInput('currency-btc', currencyBTCMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '123456789');

    expect(snapshots).toEqual([
      '₿ 0.00000001',
      '₿ 0.00000012',
      '₿ 0.00000123',
      '₿ 0.00001234',
      '₿ 0.00012345',
      '₿ 0.00123456',
      '₿ 0.01234567',
      '₿ 0.12345678',
      '₿ 1.23456789',
    ]);
  });

  test('should build plain number while typing', async () => {
    const input = renderMaskedInput('number', numberMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '1234');

    expect(snapshots).toEqual(['0.01', '0.12', '1.23', '12.34']);
  });

  test('should build percentage while typing', async () => {
    const input = renderMaskedInput('percentage', percentageMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '1234');

    expect(snapshots).toEqual(['0.01 %', '0.12 %', '1.23 %', '12.34 %']);
    expect(input.selectionStart).toBe(5);
  });

  test('should support arrow navigation and backspace for percentage', async () => {
    const input = renderMaskedInput('percentage', percentageMask);
    const { user } = await typeAndCollectSnapshots(input, '1234');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{Backspace}');

    expect(input.value).toBe('1.34 %');
    expect(input.selectionStart).toBe(1);
  });
});
