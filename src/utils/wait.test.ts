import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { wait } from './wait';

describe('wait', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should wait for a specified amount of time', async () => {
    const start = Date.now();
    const waitPromise = wait(100);
    vi.advanceTimersByTime(100);
    await waitPromise;
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  });
});
