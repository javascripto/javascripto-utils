import { describe, expect, test } from 'vitest';
import { runPromisePoolAndReturn } from './run-promise-pool-and-return';
import { AbortError, PromiseTimeoutError } from './timeout-promise';
import { wait } from './wait';

describe('runPromisePoolAndReturn', () => {
  test('returns results in input order by default', async () => {
    const tasks = [
      async () => 'first',
      async () => 'second',
      async () => 'third',
    ];

    const { results, errors } = await runPromisePoolAndReturn({
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

    const { results, errors } = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 3,
      ordering: 'completion',
    });

    expect(results).toEqual(['instant', 'fast', 'slow']);
    expect(errors).toEqual([]);
  });

  test('should results in sorted order when requested', async () => {
    const tasks = [
      async () => wait(20).then(() => 'slow'),
      async () => wait(5).then(() => 'fast'),
      async () => 'instant',
    ];

    const { results, errors } = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 3,
      ordering: 'sorted',
    });

    expect(results).toEqual(['slow', 'fast', 'instant']);
    expect(errors).toEqual([undefined, undefined, undefined]);
  });

  test('captures task errors and keeps running remaining tasks', async () => {
    const error = new Error('boom');
    const tasks = [
      async () => 'ok-1',
      async () => Promise.reject(error),
      async () => 'ok-2',
    ];

    const { results, errors } = await runPromisePoolAndReturn({
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

    const { results } = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 2,
    });

    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('handles an empty task list', async () => {
    const { results, errors } = await runPromisePoolAndReturn({
      tasks: [],
      concurrencyLimit: 1,
    });

    expect(results).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('taskExecutionTimeout causes PromiseTimeoutError and undefined result', async () => {
    const tasks = [async () => wait(100).then(() => 'x')];
    const { results, errors } = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 1,
      taskExecutionTimeout: 10,
    });

    expect(results[0]).toBeUndefined();
    expect(errors[0]).toBeInstanceOf(PromiseTimeoutError);
  });

  test('external AbortSignal aborts tasks in runPromisePool', async () => {
    const controller = new AbortController();
    const tasks = [async () => wait(100).then(() => 'ok')];

    setTimeout(() => controller.abort(), 10);

    const { results, errors } = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 1,
      signal: controller.signal,
    });

    expect(results[0]).toBeUndefined();
    expect(errors[0]).toBeInstanceOf(AbortError);
  });
});
