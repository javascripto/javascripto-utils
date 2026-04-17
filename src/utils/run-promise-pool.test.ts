import { describe, expect, test } from 'vitest';
import { runPromisePool } from './run-promise-pool';
import { wait } from './wait';

describe('runPromisePool', () => {
  test('returns results in input order by default', async () => {
    const tasks = [
      async () => 'first',
      async () => 'second',
      async () => 'third',
    ];

    const { results, errors } = await runPromisePool({
      tasks,
      concurrencyLimit: 2,
    });

    expect(results).toEqual(['first', 'second', 'third']);
    expect(errors).toEqual([undefined, undefined, undefined]);
  });

  test('returns results in completion order when requested', async () => {
    const tasks = [
      async () => wait(20).then(() => 'slow'),
      async () => wait(5).then(() => 'fast'),
      async () => 'instant',
    ];

    const { results, errors } = await runPromisePool({
      tasks,
      concurrencyLimit: 3,
      ordering: 'completion',
    });

    expect(results).toEqual(['instant', 'fast', 'slow']);
    expect(errors).toEqual([undefined, undefined, undefined]);
  });

  test('captures task errors and keeps running remaining tasks', async () => {
    const error = new Error('boom');
    const tasks = [
      async () => 'ok-1',
      async () => Promise.reject(error),
      async () => 'ok-2',
    ];

    const { results, errors } = await runPromisePool({
      tasks,
      concurrencyLimit: 2,
    });

    expect(results).toEqual(['ok-1', undefined, 'ok-2']);
    expect(errors[0]).toBeUndefined();
    expect(errors[1]).toBe(error);
    expect(errors[2]).toBeUndefined();
  });

  test('respects the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 6 }, (_, index) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await wait(10);
      active--;
      return index;
    });

    const { results } = await runPromisePool({
      tasks,
      concurrencyLimit: 2,
    });

    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('handles an empty task list', async () => {
    const { results, errors } = await runPromisePool({
      tasks: [],
      concurrencyLimit: 1,
    });

    expect(results).toEqual([]);
    expect(errors).toEqual([]);
  });
});
