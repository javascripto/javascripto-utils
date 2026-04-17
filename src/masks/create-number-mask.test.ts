/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { createNumberMask, makeNumberParser } from './create-number-mask';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';

afterEach(() => {
  cleanupDom();
});

describe('createNumberMask', () => {
  test('should format numbers with prefix and separators while typing', async () => {
    const input = renderMaskedInput(
      'currency-brl',
      createNumberMask({
        prefix: 'R$ ',
        thousandSeparator: '.',
        fractionSeparator: ',',
        fractionDigits: 2,
      }),
    );

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

  test('should keep empty input empty', () => {
    const input = renderMaskedInput('number', createNumberMask());

    fireEvent.input(input, {
      target: { value: '', selectionStart: 0 },
    });

    expect(input.value).toBe('');
  });

  test('should handle suffix cursor adjustment', async () => {
    const input = renderMaskedInput(
      'percentage',
      createNumberMask({
        suffix: ' %',
        fractionDigits: 2,
        fractionSeparator: '.',
      }),
    );

    await typeAndCollectSnapshots(input, '1234');

    expect(input.value).toBe('12.34 %');
    expect(input.selectionStart).toBe(5);
  });

  test('should toggle negative state when typing "-" and place sign before prefix', () => {
    const input = document.createElement('input');
    input.value = '-123456';
    input.selectionStart = 1;
    input.dataset.negative = 'false';

    const mask = createNumberMask({
      prefix: 'R$ ',
      thousandSeparator: '.',
      fractionSeparator: ',',
      fractionDigits: 2,
      unsigned: false,
    });

    mask({
      target: input,
      nativeEvent: { data: '-' },
    } as never);

    expect(input.dataset.negative).toBe('true');
    expect(input.value).toBe('-R$ 1.234,56');
  });

  test('should clear negative state when minus is removed from input', () => {
    const input = document.createElement('input');
    input.value = '123';
    input.selectionStart = 0;
    input.dataset.negative = 'true';

    const mask = createNumberMask({
      unsigned: false,
    });

    mask({
      target: input,
      nativeEvent: { data: null },
    } as never);

    expect(input.dataset.negative).toBe('false');
    expect(input.value).toBe('1.23');
  });

  test('should preserve a lone minus sign for progressive typing', () => {
    const input = document.createElement('input');
    input.value = '-';
    input.selectionStart = 1;
    input.dataset.negative = 'true';

    const mask = createNumberMask({
      unsigned: false,
    });

    mask({
      target: input,
      nativeEvent: { data: null },
    } as never);

    expect(input.value).toBe('-');
  });
});

describe('makeNumberParser', () => {
  test('should normalize formatted values with comma fraction separator', () => {
    const parser = makeNumberParser(',', 2);

    expect(parser('R$ 1.234,5')).toBe('1234.50');
    expect(parser('-R$ 1.234,56')).toBe('-1234.56');
  });

  test('should normalize formatted values with dot fraction separator', () => {
    const parser = makeNumberParser('.', 2);

    expect(parser('  1234.5 ')).toBe('1234.50');
    expect(parser('-$1,234.56')).toBe('-1234.56');
  });

  test('should return empty string when there is no numeric content', () => {
    const parser = makeNumberParser(',', 2);

    expect(parser('')).toBe('');
    expect(parser('abc')).toBe('');
  });
});
