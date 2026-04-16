import { describe, expect, test } from 'vitest';
import { safeAwait } from './safe-await';

describe('safeAwait', () => {
  test('should handle a successful promise', async () => {
    const promise = Promise.resolve('Success');
    const [result, error] = await safeAwait(promise);
    expect(result).toBe('Success');
    expect(error).toBeNull();
  });

  test('should handle a promise that rejects with an error', async () => {
    const promise = Promise.reject(new Error('Failure'));
    const [result, error] = await safeAwait(promise);
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Failure');
  });
});
