/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import {
  dateBRMask,
  dateISO8601Mask,
  isDateStringValid,
  parseDateBR,
  parseISO8601Date,
} from './date';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';

afterEach(() => {
  cleanupDom();
});

describe('date masks', () => {
  test('should build BR date mask while typing', async () => {
    const input = renderMaskedInput('date-br', dateBRMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '01022025');

    expect(snapshots).toEqual([
      '0',
      '01',
      '01/0',
      '01/02',
      '01/02/2',
      '01/02/20',
      '01/02/202',
      '01/02/2025',
    ]);
  });

  test('should build ISO 8601 date mask while typing', async () => {
    const input = renderMaskedInput('date-iso', dateISO8601Mask);

    const { snapshots } = await typeAndCollectSnapshots(input, '20250131');

    expect(snapshots).toEqual([
      '2',
      '20',
      '202',
      '2025',
      '2025-0',
      '2025-01',
      '2025-01-3',
      '2025-01-31',
    ]);
  });

  test('should support backspace after moving cursor left', async () => {
    const input = renderMaskedInput('date-br', dateBRMask);
    const { user } = await typeAndCollectSnapshots(input, '01022025');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{Backspace}');

    expect(input.value).toBe('01/02/225');
  });
});

describe('date parsers', () => {
  test('should validate ISO date strings accurately', () => {
    expect(isDateStringValid('2024-02-29')).toBe(true);
    expect(isDateStringValid('2023-02-29')).toBe(false);
  });

  test('should parse ISO 8601 digit strings into valid dates', () => {
    expect(parseISO8601Date('20240229')).toBe('2024-02-29');
    expect(parseISO8601Date('2024-02-29')).toBe('2024-02-29');
  });

  test('should return empty string for incomplete ISO 8601 date input', () => {
    expect(parseISO8601Date('2024022')).toBe('');
  });

  test('should return Invalid date for impossible ISO 8601 dates', () => {
    expect(parseISO8601Date('20230229')).toBe('Invalid date');
  });

  test('should parse BR digit strings into valid ISO dates', () => {
    expect(parseDateBR('29022024')).toBe('2024-02-29');
    expect(parseDateBR('29/02/2024')).toBe('2024-02-29');
  });

  test('should return empty string for incomplete BR date input', () => {
    expect(parseDateBR('0102202')).toBe('');
  });

  test('should return Invalid date for impossible BR dates', () => {
    expect(parseDateBR('31022025')).toBe('Invalid date');
  });
});
