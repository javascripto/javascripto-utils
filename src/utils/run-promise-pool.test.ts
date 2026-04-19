import { describe, expect, test } from 'vitest';
import {
  type CompletedResult,
  ErrorsCountLimitReachedError,
  FailFastError,
  runPromisePool,
} from './run-promise-pool';
import { AbortError } from './timeout-promise';
import { wait } from './wait';

describe('runPromisePool', () => {
  test('stopWhen prevents scheduling new tasks', async () => {
    const started: number[] = [];
    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      started.push(i);
      await wait(10);
      return i;
    });

    await runPromisePool({
      tasks,
      concurrencyLimit: 2,
      stopWhen: ({ index, result }) => index === 1 && result === 1,
    });

    // deve ter começado pelo menos as duas primeiras tasks, e não todas
    expect(started.includes(0)).toBe(true);
    expect(started.includes(1)).toBe(true);
    // tarefas posteriores podem não ser iniciadas
    expect(started.length).toBeLessThanOrEqual(3);
  });

  test('failFast rejects and stops scheduling further tasks', async () => {
    const started: number[] = [];
    const tasks = [
      async () => {
        started.push(0);
        throw new Error('boom');
      },
      async () => {
        started.push(1);
        await wait(20);
        return 1;
      },
    ];

    await expect(
      runPromisePool({ tasks, concurrencyLimit: 1, failFast: true }),
    ).rejects.toBeInstanceOf(FailFastError);

    expect(started).toEqual([0]);
  });

  test('failFast does not abort already running tasks', async () => {
    const started: number[] = [];
    const completed: CompletedResult<string, Error>[] = [];

    const tasks = [
      async () => {
        started.push(0);
        throw new Error('boom');
      },
      async () => {
        started.push(1);
        await wait(30);
        return 'ok';
      },
    ];

    await expect(
      runPromisePool({
        tasks,
        concurrencyLimit: 2,
        failFast: true,
        onTaskComplete: r => completed.push(r),
      }),
    ).rejects.toBeInstanceOf(FailFastError);

    // both tasks should have started
    expect(started).toEqual([0, 1]);

    // wait a bit to allow the long-running task to finish and report
    await wait(50);

    const item = completed.find(i => i.index === 1);
    expect(item).toBeDefined();
    expect(item?.error).toBeUndefined();
    expect(item?.result).toBe('ok');
  });

  test('errorsCountLimit triggers ErrorsCountLimitReachedError', async () => {
    const started: number[] = [];
    const tasks = [
      async () => {
        started.push(0);
        throw new Error('e1');
      },
    ];

    await expect(
      runPromisePool({ tasks, concurrencyLimit: 1, errorsCountLimit: 1 }),
    ).rejects.toBeInstanceOf(ErrorsCountLimitReachedError);

    expect(started).toEqual([0]);
  });

  test('errorsCountLimit with abortOnErrorsLimit aborts running tasks', async () => {
    const started: number[] = [];
    const completed: CompletedResult<string, Error>[] = [];

    const tasks = [
      async () => {
        started.push(0);
        throw new Error('e1');
      },
      async () => {
        started.push(1);
        await wait(100);
        return 'late';
      },
    ];

    await expect(
      runPromisePool({
        tasks,
        concurrencyLimit: 2,
        errorsCountLimit: 1,
        abortOnErrorsLimit: true,
        onTaskComplete: r => completed.push(r),
      }),
    ).rejects.toBeInstanceOf(ErrorsCountLimitReachedError);

    // both tasks should have started because concurrencyLimit=2
    expect(started).toEqual([0, 1]);
    // ensure the long-running task was aborted and reported an AbortError
    const abortItem = completed.find(i => i.index === 1);
    expect(abortItem).toBeDefined();
    expect(abortItem?.error).toBeDefined();
    // AbortError class comes from timeout-promise
    const { AbortError } = await import('./timeout-promise');
    expect(abortItem?.error).toBeInstanceOf(AbortError);
  });

  test('external AbortSignal aborts running tasks and reports AbortError', async () => {
    const controller = new AbortController();
    const completed: CompletedResult<string, Error>[] = [];

    const tasks = [
      async () => {
        await wait(100);
        return 'ok';
      },
    ];

    const promise = runPromisePool({
      tasks,
      concurrencyLimit: 1,
      onTaskComplete: result => completed.push(result),
      signal: controller.signal,
    });

    // abort shortly after starting
    setTimeout(() => controller.abort(), 10);

    await promise;

    expect(completed.length).toBeGreaterThanOrEqual(1);
    const [item] = completed;
    expect(item?.error).toBeDefined();
    expect(item?.error).toBeInstanceOf(AbortError);
  });
});
