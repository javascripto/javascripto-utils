import { describe, expect, test } from 'vitest';
import { trimIndent } from './trim-indent';

describe('trimIndent', () => {
  test('should trim common leading whitespace from each line removind first and last empty lines', () => {
    const string = trimIndent(`
        line 1
          line 2
        line 3
    `);
    expect(string).toBe(
      [
        'line 1', //
        '  line 2', //
        'line 3', //
      ].join('\n'),
    );
  });
});
