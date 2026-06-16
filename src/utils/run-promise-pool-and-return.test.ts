import { describe, expect, test, vi } from 'vitest';
import {
  ErrorsCountLimitReachedError,
  FailFastError,
  type Task,
} from './run-promise-pool';
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

  test('records tasks that resolve to undefined', async () => {
    const tasks = [async () => undefined, async () => 'x', async () => undefined];

    // completion: todos os sucessos entram (inclusive os undefined)
    const completion = await runPromisePoolAndReturn<unknown>({
      tasks,
      concurrencyLimit: 3,
      ordering: 'completion',
    });
    expect(completion.results).toHaveLength(3);
    expect(completion.results).toContain('x');
    expect(completion.errors).toEqual([]);

    // sorted: o slot recebe undefined, mas o índice é preservado
    const onTaskComplete = vi.fn();
    const sorted = await runPromisePoolAndReturn<unknown>({
      tasks,
      concurrencyLimit: 3,
      onTaskComplete,
    });
    expect(sorted.results).toEqual([undefined, 'x', undefined]);
    expect(onTaskComplete).toHaveBeenCalledTimes(3);
  });

  test('records falsy rejection reasons (e.g. throw 0)', async () => {
    const tasks = [
      async () => {
        throw 0;
      },
      async () => 'ok',
    ];

    const { results, errors } = await runPromisePoolAndReturn<string, number>({
      tasks,
      concurrencyLimit: 2,
    });

    expect(errors[0]).toBe(0);
    expect(results[1]).toBe('ok');
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

  test('handles a task list where every task fails', async () => {
    const tasks = [
      async () => {
        throw new Error('e0');
      },
      async () => {
        throw new Error('e1');
      },
      async () => {
        throw new Error('e2');
      },
    ];

    // sorted: errors alinhados pelo índice, results todos undefined
    const sorted = await runPromisePoolAndReturn({ tasks, concurrencyLimit: 2 });
    expect(sorted.results).toEqual([undefined, undefined, undefined]);
    expect(sorted.errors.map(e => (e as Error)?.message)).toEqual([
      'e0',
      'e1',
      'e2',
    ]);

    // completion: results vazio, errors com as 3 falhas
    const completion = await runPromisePoolAndReturn({
      tasks,
      concurrencyLimit: 2,
      ordering: 'completion',
    });
    expect(completion.results).toEqual([]);
    expect(completion.errors).toHaveLength(3);
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

  test('failFast rejects through the wrapper (conc >= n)', async () => {
    const tasks = [
      async () => {
        throw new Error('boom');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    await expect(
      runPromisePoolAndReturn({ tasks, concurrencyLimit: 10, failFast: true }),
    ).rejects.toBeInstanceOf(FailFastError);
  });

  test('errorsCountLimit rejects through the wrapper', async () => {
    const tasks = [
      async () => {
        throw new Error('e0');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    await expect(
      runPromisePoolAndReturn({ tasks, concurrencyLimit: 10, errorsCountLimit: 1 }),
    ).rejects.toBeInstanceOf(ErrorsCountLimitReachedError);
  });

  test('stopWhen stops scheduling and aborts in-flight siblings', async () => {
    const tasks: Task<string>[] = [
      async () => {
        await wait(10);
        return 'trigger';
      },
      async (signal?: AbortSignal) =>
        new Promise<string>((resolve, reject) => {
          const id = setTimeout(() => resolve('late'), 1000);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(id);
              reject(new AbortError());
            },
            { once: true },
          );
        }),
      async () => 'never-scheduled',
    ];

    const { results, errors } = await runPromisePoolAndReturn<string>({
      tasks,
      concurrencyLimit: 2,
      stopWhen: ({ result }) => result === 'trigger',
    });

    expect(results[0]).toBe('trigger');
    // sibling in flight was aborted
    expect(errors[1]).toBeInstanceOf(AbortError);
    // third task was never scheduled (scheduling stopped)
    expect(results[2]).toBeUndefined();
    expect(errors[2]).toBeUndefined();
  });

  test('captures a synchronous throw as an error', async () => {
    const tasks: Task<string>[] = [
      () => {
        throw new Error('sync');
      },
      async () => 'ok',
    ];

    const { results, errors } = await runPromisePoolAndReturn<string>({
      tasks,
      concurrencyLimit: 2,
    });

    expect(errors[0]).toBeInstanceOf(Error);
    expect(results[1]).toBe('ok');
  });

  test('accepts async iterable task sources', async () => {
    async function* tasks(): AsyncGenerator<Task<string>> {
      yield async () => wait(10).then(() => 'first');
      yield async () => 'second';
      yield async () => wait(1).then(() => 'third');
    }

    const { results, errors } = await runPromisePoolAndReturn({
      tasks: tasks(),
      concurrencyLimit: 2,
    });

    expect(results).toEqual(['first', 'second', 'third']);
    expect(errors).toEqual([undefined, undefined, undefined]);
  });

  test('returns the final success after retries', async () => {
    let attempts = 0;

    const { results, errors } = await runPromisePoolAndReturn({
      tasks: [
        async () => {
          attempts++;
          if (attempts === 1) throw new Error('temporary');
          return 'ok';
        },
      ],
      concurrencyLimit: 1,
      retryCount: 1,
    });

    expect(attempts).toBe(2);
    expect(results).toEqual(['ok']);
    expect(errors).toEqual([undefined]);
  });
});
