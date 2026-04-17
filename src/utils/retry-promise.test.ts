import { describe, expect, test } from 'vitest';
import { retryPromise } from './retry-promise';

describe('retryPromise', () => {
  test('retries until success', async () => {
    let attempts = 0;
    const promiseFactory = () =>
      new Promise<string>((resolve, reject) => {
        attempts++;
        if (attempts < 3) reject(new Error('fail'));
        else resolve('ok');
      });

    const result = await retryPromise(promiseFactory, { retryLimit: 5, delay: 0 });
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  test('throws after exceeding retryLimit', async () => {
    let attempts = 0;
    const promiseFactory = () =>
      new Promise<void>((_resolve, reject) => {
        attempts++;
        reject(new Error('always fail'));
      });

    await expect(retryPromise(promiseFactory, { retryLimit: 2, delay: 0 })).rejects.toThrow(
      'always fail',
    );
    expect(attempts).toBe(3); // retryLimit + 1 attempts
  });
});
