/** @vitest-environment jsdom */

import { afterEach, describe, expect, test } from 'vitest';
import {
  cleanupDom,
  renderMaskedInput,
  typeAndCollectSnapshots,
} from './testing-library-helpers';
import { upperCaseMask } from './upper-case';

afterEach(() => {
  cleanupDom();
});

describe('upperCaseMask', () => {
  test('should build upper case text while typing', async () => {
    const input = renderMaskedInput('upper-case', upperCaseMask);

    const { snapshots } = await typeAndCollectSnapshots(input, 'abc');

    expect(snapshots).toEqual(['A', 'AB', 'ABC']);
  });

  test('should support arrow navigation and backspace', async () => {
    const input = renderMaskedInput('upper-case', upperCaseMask);
    const { user } = await typeAndCollectSnapshots(input, 'abcd');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{Backspace}');

    expect(input.value).toBe('ACD');
    expect(input.selectionStart).toBe(1);
  });
});
