import { describe, expect, test, vi } from 'vitest';
import { retryPromise } from './retry-promise';
import * as waitModule from './wait';

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

  test('waits between failed attempts before succeeding', async () => {
    const waitSpy = vi.spyOn(waitModule, 'wait').mockResolvedValue(undefined);
    let attempts = 0;

    const promiseFactory = () =>
      new Promise<string>((resolve, reject) => {
        attempts++;
        if (attempts < 3) reject(new Error('fail'));
        else resolve('ok');
      });

    const result = await retryPromise(promiseFactory, { retryLimit: 5, delay: 25 });

    expect(result).toBe('ok');
    expect(waitSpy).toHaveBeenCalledTimes(2);
    expect(waitSpy).toHaveBeenNthCalledWith(1, 25);
    expect(waitSpy).toHaveBeenNthCalledWith(2, 25);

    waitSpy.mockRestore();
  });

  test('wraps non-Error rejections into Error', async () => {
    await expect(
      retryPromise(
        () => Promise.reject('plain failure'),
        { retryLimit: 0, delay: 0 },
      ),
    ).rejects.toThrow('plain failure');
  });
});
