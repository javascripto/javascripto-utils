import { describe, expect, test } from 'vitest';
import {
  type CompletedResult,
  ErrorsCountLimitReachedError,
  FailFastError,
  runPromisePool,
  type Task,
} from './run-promise-pool';
import { AbortError, PromiseTimeoutError } from './timeout-promise';
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

  test('failFast aborts already running tasks when abortOnFailFast is true', async () => {
    const started: number[] = [];
    const completed: CompletedResult<string, Error>[] = [];

    const tasks: Task<string>[] = [
      async () => {
        started.push(0);
        throw new Error('boom');
      },
      async (signal?: AbortSignal) => {
        started.push(1);
        return new Promise<string>((resolve, reject) => {
          const id = setTimeout(() => resolve('late'), 1000);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(id);
              reject(new AbortError());
            },
            { once: true },
          );
        });
      },
    ];

    await expect(
      runPromisePool({
        tasks,
        concurrencyLimit: 2,
        failFast: true,
        abortOnFailFast: true,
        onTaskComplete: r => completed.push(r),
      }),
    ).rejects.toBeInstanceOf(FailFastError);

    expect(started).toEqual([0, 1]);
    const sibling = completed.find(item => item.index === 1);
    expect(sibling?.error).toBeInstanceOf(AbortError);
  });

  test('failFast surfaces the error when concurrencyLimit >= tasks.length', async () => {
    // Regression: with conc >= n the loop never awaits Promise.race, so the
    // failing task used to be removed from `executing` before being observed,
    // silently swallowing the error and leaking an unhandledRejection.
    const tasks = [
      async () => {
        throw new Error('boom');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    await expect(
      runPromisePool({ tasks, concurrencyLimit: 10, failFast: true }),
    ).rejects.toBeInstanceOf(FailFastError);
  });

  test('errorsCountLimit surfaces the error when concurrencyLimit >= tasks.length', async () => {
    const tasks = [
      async () => {
        throw new Error('e0');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    await expect(
      runPromisePool({ tasks, concurrencyLimit: 10, errorsCountLimit: 1 }),
    ).rejects.toBeInstanceOf(ErrorsCountLimitReachedError);
  });

  test('failFast does not leak an unhandled rejection (conc >= n)', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      const tasks = Array.from({ length: 6 }, (_, i) => async () => {
        if (i === 0) throw new Error('boom');
        await wait(10);
        return i;
      });

      await runPromisePool({
        tasks,
        concurrencyLimit: 10,
        failFast: true,
      }).catch(() => null);

      // let any stray microtasks/timers flush before asserting
      await wait(40);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    expect(unhandled).toEqual([]);
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

  test('throws RangeError for invalid concurrencyLimit', async () => {
    const tasks = [async () => 1];
    for (const bad of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        runPromisePool({ tasks, concurrencyLimit: bad }),
      ).rejects.toBeInstanceOf(RangeError);
    }
  });

  test('uses the benchmark concurrency default when omitted', async () => {
    const completed: number[] = [];

    await runPromisePool({
      tasks: [async () => 1, async () => 2],
      onTaskComplete: item => {
        if (item.ok) completed.push(item.result);
      },
    });

    expect(completed.sort((a, b) => a - b)).toEqual([1, 2]);
  });

  test('floors a non-integer concurrencyLimit', async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 6 }, () => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await wait(10);
      active--;
    });

    // 2.9 -> floor -> 2 concurrent at most
    await runPromisePool({ tasks, concurrencyLimit: 2.9 });

    expect(maxActive).toBe(2);
  });

  test('resolves for an empty task list', async () => {
    await expect(
      runPromisePool({ tasks: [], concurrencyLimit: 1 }),
    ).resolves.toBeUndefined();
  });

  test('invokes lifecycle callbacks (onTaskStart, onRunningTaskChange)', async () => {
    const started: number[] = [];
    const runningCounts: number[] = [];
    const tasks = Array.from({ length: 3 }, (_, i) => async () => {
      await wait(5);
      return i;
    });

    await runPromisePool({
      tasks,
      concurrencyLimit: 2,
      onTaskStart: i => started.push(i),
      onRunningTaskChange: n => runningCounts.push(n),
    });

    expect(started).toEqual([0, 1, 2]);
    expect(Math.max(...runningCounts)).toBeLessThanOrEqual(2);
    // drains back down to zero by the end
    expect(runningCounts.at(-1)).toBe(0);
  });

  test('awaits waitForSpace before starting each task', async () => {
    const calls: string[] = [];
    let n = 0;
    const tasks = Array.from({ length: 3 }, (_, i) => async () => {
      calls.push(`task${i}`);
      return i;
    });

    await runPromisePool({
      tasks,
      concurrencyLimit: 1,
      waitForSpace: async () => {
        calls.push(`space${n++}`);
      },
    });

    expect(calls).toEqual([
      'space0',
      'task0',
      'space1',
      'task1',
      'space2',
      'task2',
    ]);
  });

  test('taskExecutionTimeout reports PromiseTimeoutError', async () => {
    const completed: CompletedResult<string, Error>[] = [];

    await runPromisePool({
      tasks: [async () => wait(100).then(() => 'late')],
      concurrencyLimit: 1,
      taskExecutionTimeout: 10,
      onTaskComplete: r => completed.push(r),
    });

    expect(completed[0]?.error).toBeInstanceOf(PromiseTimeoutError);
  });

  test('stopWhen aborts in-flight sibling tasks', async () => {
    const completed: CompletedResult<number, Error>[] = [];
    const tasks: Task<number>[] = [
      async () => {
        await wait(10);
        return 0; // triggers stopWhen
      },
      async (signal?: AbortSignal) =>
        new Promise<number>((resolve, reject) => {
          const id = setTimeout(() => resolve(1), 1000);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(id);
              reject(new AbortError());
            },
            { once: true },
          );
        }),
    ];

    await runPromisePool({
      tasks,
      concurrencyLimit: 2,
      stopWhen: ({ index }) => index === 0,
      onTaskComplete: r => completed.push(r),
    });

    const sibling = completed.find(c => c.index === 1);
    expect(sibling).toBeDefined();
    expect(sibling?.error).toBeInstanceOf(AbortError);
  });

  test('handles a task that throws synchronously', async () => {
    const completed: CompletedResult<number, Error>[] = [];
    // A non-async task that throws synchronously (instead of returning a
    // rejected promise) must be treated like any other failure.
    const tasks: Task<number>[] = [
      () => {
        throw new Error('sync-throw');
      },
      async () => 1,
    ];

    await runPromisePool({
      tasks,
      concurrencyLimit: 2,
      onTaskComplete: r => completed.push(r),
    });

    const first = completed.find(c => c.index === 0);
    expect(first?.ok).toBe(false);
    if (first && !first.ok) expect(first.error).toBeInstanceOf(Error);
    expect(completed.find(c => c.index === 1)?.ok).toBe(true);
  });

  test('a synchronous throw still triggers failFast', async () => {
    const tasks: Task<number>[] = [
      () => {
        throw new Error('sync');
      },
      async () => wait(20).then(() => 1),
    ];

    await expect(
      runPromisePool({ tasks, concurrencyLimit: 1, failFast: true }),
    ).rejects.toBeInstanceOf(FailFastError);
  });

  test('isolates throws from notification callbacks', async () => {
    const seen: number[] = [];
    const tasks = [async () => 1, async () => 2, async () => 3];

    await expect(
      runPromisePool({
        tasks,
        concurrencyLimit: 2,
        onTaskStart: () => {
          throw new Error('start');
        },
        onRunningTaskChange: () => {
          throw new Error('running');
        },
        onTaskComplete: completed => {
          if (completed.ok) seen.push(completed.result);
          throw new Error('complete');
        },
      }),
    ).resolves.toBeUndefined();

    // every result was still delivered despite the callbacks throwing
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  test('a throwing stopWhen is treated as false (does not stop)', async () => {
    const started: number[] = [];
    const tasks = Array.from({ length: 3 }, (_, i) => async () => {
      started.push(i);
      return i;
    });

    await runPromisePool({
      tasks,
      concurrencyLimit: 1,
      stopWhen: () => {
        throw new Error('stopWhen-throw');
      },
    });

    expect(started).toEqual([0, 1, 2]);
  });

  test('classifies a task that throws undefined as an error (ok: false)', async () => {
    const completed: CompletedResult<string, unknown>[] = [];

    await runPromisePool<string, unknown>({
      tasks: [
        async () => {
          throw undefined;
        },
      ],
      concurrencyLimit: 1,
      onTaskComplete: r => completed.push(r),
    });

    expect(completed[0]?.ok).toBe(false);
  });

  test('retries a failing task until it succeeds', async () => {
    let attempts = 0;
    const completed: CompletedResult<string, Error>[] = [];

    await runPromisePool({
      tasks: [
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('temporary');
          return 'ok';
        },
      ],
      concurrencyLimit: 1,
      retryCount: 2,
      onTaskComplete: item => completed.push(item),
    });

    expect(attempts).toBe(3);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.ok).toBe(true);
    expect(completed[0]?.result).toBe('ok');
  });

  test('does not retry when shouldRetry returns false', async () => {
    let attempts = 0;

    await runPromisePool({
      tasks: [
        async () => {
          attempts++;
          throw new Error('permanent');
        },
      ],
      concurrencyLimit: 1,
      retryCount: 3,
      shouldRetry: () => false,
    });

    expect(attempts).toBe(1);
  });

  test('keeps the original task error when retryDelay throws', async () => {
    const originalError = new Error('original');
    const completed: CompletedResult<number, Error>[] = [];

    await runPromisePool({
      tasks: [
        async () => {
          throw originalError;
        },
      ],
      concurrencyLimit: 1,
      retryCount: 1,
      retryDelay: () => {
        throw new Error('delay');
      },
      onTaskComplete: item => completed.push(item),
    });

    expect(completed[0]?.error).toBe(originalError);
  });

  test('external abort cancels a pending retryDelay', async () => {
    const controller = new AbortController();
    const completed: CompletedResult<number, Error>[] = [];
    let attempts = 0;

    const promise = runPromisePool({
      tasks: [
        async () => {
          attempts++;
          throw new Error('temporary');
        },
      ],
      concurrencyLimit: 1,
      retryCount: 3,
      retryDelay: 1000,
      signal: controller.signal,
      onTaskComplete: item => completed.push(item),
    });

    setTimeout(() => controller.abort(), 10);

    await promise;

    expect(attempts).toBe(1);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.error).toBeInstanceOf(AbortError);
  });

  test('failFast rejects only after retries are exhausted', async () => {
    const started: number[] = [];
    let attempts = 0;

    const tasks: Task<number>[] = [
      async () => {
        started.push(0);
        attempts++;
        throw new Error('boom');
      },
      async () => {
        started.push(1);
        return 1;
      },
    ];

    await expect(
      runPromisePool({
        tasks,
        concurrencyLimit: 1,
        retryCount: 1,
        failFast: true,
      }),
    ).rejects.toBeInstanceOf(FailFastError);

    expect(attempts).toBe(2);
    expect(started).toEqual([0, 0]);
  });

  test('errorsCountLimit ignores retry attempts that eventually succeed', async () => {
    let attempts = 0;

    await expect(
      runPromisePool({
        tasks: [
          async () => {
            attempts++;
            if (attempts === 1) throw new Error('temporary');
            return 'ok';
          },
        ],
        concurrencyLimit: 1,
        retryCount: 1,
        errorsCountLimit: 1,
      }),
    ).resolves.toBeUndefined();

    expect(attempts).toBe(2);
  });

  test('taskExecutionTimeout applies to each retry attempt', async () => {
    const completed: CompletedResult<string, Error>[] = [];
    let attempts = 0;

    await runPromisePool({
      tasks: [
        async () => {
          attempts++;
          await wait(30);
          return 'late';
        },
      ],
      concurrencyLimit: 1,
      taskExecutionTimeout: 10,
      retryCount: 1,
      onTaskComplete: item => completed.push(item),
    });

    expect(attempts).toBe(2);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.error).toBeInstanceOf(PromiseTimeoutError);
  });

  test('throws RangeError for invalid retryCount', async () => {
    const tasks = [async () => 1];

    for (const retryCount of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        runPromisePool({ tasks, concurrencyLimit: 1, retryCount }),
      ).rejects.toBeInstanceOf(RangeError);
    }
  });

  test('consumes async iterable task sources lazily', async () => {
    let produced = 0;
    let completed = 0;
    let maxProducedAhead = 0;
    let active = 0;
    let maxActive = 0;
    const results: number[] = [];

    async function* tasks(): AsyncGenerator<Task<number>> {
      for (let i = 0; i < 8; i++) {
        produced++;
        maxProducedAhead = Math.max(maxProducedAhead, produced - completed);
        yield async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await wait(5);
          active--;
          completed++;
          return i;
        };
      }
    }

    await runPromisePool({
      tasks: tasks(),
      concurrencyLimit: 2,
      onTaskComplete: item => {
        if (item.ok) results.push(item.result);
      },
    });

    expect(produced).toBe(8);
    expect(maxActive).toBe(2);
    expect(maxProducedAhead).toBeLessThanOrEqual(2);
    expect(results.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
