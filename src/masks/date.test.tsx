/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import { dateBRMask, dateISO8601Mask } from './date';
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
