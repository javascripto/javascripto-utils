import { describe, expect, test } from 'vitest';
import { timeoutPromise } from './timeout-promise';
import { wait } from './wait';

describe('timeoutPromise', () => {
  test('should resolve if the promise resolves before the timeout', async () => {
    const promise = wait(100).then(() => 'success');
    const result = await timeoutPromise(promise, 200);
    expect(result).toBe('success');
  });

  test('should reject with PromiseTimeoutError if the promise does not resolve before the timeout', async () => {
    const promise = wait(200).then(() => 'success');
    try {
      await timeoutPromise(promise, 100);
      throw new Error('Expected timeoutPromise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Promise timed out after 100 milliseconds');
    }
  });

  test('should reject with the original error if the promise rejects before the timeout', async () => {
    const promise = wait(100).then(() => {
      throw new Error('Original error');
    });
    try {
      await timeoutPromise(promise, 200);
      throw new Error('Expected timeoutPromise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Original error');
    }
  });

  test('should reject with PromiseTimeoutError even if the original promise eventually resolves', async () => {
    const promise = wait(200).then(() => 'success');
    try {
      await timeoutPromise(promise, 100);
      throw new Error('Expected timeoutPromise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Promise timed out after 100 milliseconds');
    }
  });

  test('should reject with PromiseTimeoutError even if the original promise eventually rejects', async () => {
    const promise = wait(200).then(() => {
      throw new Error('Original error');
    });
    try {
      await timeoutPromise(promise, 100);
      throw new Error('Expected timeoutPromise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Promise timed out after 100 milliseconds');
    }
  })

  test('should handle multiple concurrent timeoutPromise calls correctly', async () => {
    const promises = [
      timeoutPromise(wait(100).then(() => 'first'), 200),
      timeoutPromise(wait(200).then(() => 'second'), 150),
      timeoutPromise(wait(300).then(() => 'third'), 250),
    ];

    try {
      await Promise.all(promises);
      throw new Error('Expected some promises to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Promise timed out after 150 milliseconds');
    }
  });

  test('should not reject with PromiseTimeoutError if the promise resolves just before the timeout', async () => {
    const promise = wait(99).then(() => 'success');
    const result = await timeoutPromise(promise, 100);
    expect(result).toBe('success');
  });

  test('should reject with PromiseTimeoutError if the promise resolves just after the timeout', async () => {
    const promise = wait(101).then(() => 'success');
    try {
      await timeoutPromise(promise, 100);
      throw new Error('Expected timeoutPromise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Promise timed out after 100 milliseconds');
    }
  });

  test('should not race if milliseconds is null', async () => {
    const promise = wait(100).then(() => 'success');
    const result = await timeoutPromise(promise, null);
    expect(result).toBe('success');
  })

  test('should not race if milliseconds is undefined', async () => {
    const promise = wait(100).then(() => 'success');
    const result = await timeoutPromise(promise, undefined);
    expect(result).toBe('success');
  });
});
