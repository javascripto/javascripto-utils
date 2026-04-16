/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import { phoneMask } from './phone';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';

afterEach(() => {
  cleanupDom();
});

describe('phoneMask', () => {
  test('should build the mask as the user types', async () => {
    const input = renderMaskedInput('phone', phoneMask);

    const { snapshots } = await typeAndCollectSnapshots(input, '11987654321');

    expect(snapshots).toEqual([
      '1',
      '11',
      '(11) 9',
      '(11) 98',
      '(11) 987',
      '(11) 9876',
      '(11) 98765',
      '(11) 98765-4',
      '(11) 98765-43',
      '(11) 98765-432',
      '(11) 98765-4321',
    ]);
  });

  test('should support arrow navigation and backspace in the middle', async () => {
    const input = renderMaskedInput('phone', phoneMask);
    const { user } = await typeAndCollectSnapshots(input, '11987654321');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{Backspace}');

    expect(input.value).toBe('(11) 98765-421');
  });
});
