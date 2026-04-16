import { describe, expect, test } from 'vitest';
import { memoize } from './memoize';

describe('memoize', () => {
  function getRandomNumber() {
    return Math.random();
  }
  test('should not return the same result for non-memoized functions', async () => {
    const firstCallResult = getRandomNumber();
    const secondCallResult = getRandomNumber();
    expect(firstCallResult).not.toBe(secondCallResult);
    expect(getRandomNumber.name).toBe('getRandomNumber');
  });

  test('should return the same result for memoized functions', async () => {
    const memoizedGetRandomNumber = memoize(getRandomNumber);
    const firstCallResult = memoizedGetRandomNumber();
    const secondCallResult = memoizedGetRandomNumber();
    expect(firstCallResult).toBe(secondCallResult);
    expect(memoizedGetRandomNumber.name).toBe('getRandomNumber');
  });

  test('should return an empty string for anonymous functions names', async () => {
    const memoizedAnonymousFunction = memoize(() => Math.random());
    expect(memoizedAnonymousFunction.name).toBe('');
  });
});
