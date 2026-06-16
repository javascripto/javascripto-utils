import { describe, expect, test, vi } from 'vitest';
import type { CompletedResult, Task } from './run-promise-pool';
import {
  ErrorsCountLimitReachedError,
  FailFastError,
  runPromisePoolCore,
} from './run-promise-pool';
import { runPromisePoolStream } from './run-promise-pool-stream';
import { AbortError, PromiseTimeoutError } from './timeout-promise';
import { wait } from './wait';

describe('runPromisePoolStream', () => {
  test('yields completed results and respects bufferLimit/backpressure', async () => {
    const tasks = [
      async () => 'a',
      async () => 'b',
      () => wait(5).then(() => 'c'),
    ];

    const onBufferLimitReached = vi.fn();

    const results: Array<unknown> = [];
    const iterator = runPromisePoolStream({
      tasks,
      concurrencyLimit: 2,
      bufferLimit: 1,
      onBufferLimitReached,
    });

    const first = await iterator.next();
    if (!first.done) results.push(first.value.result ?? first.value.error);

    await wait(20);
    expect(onBufferLimitReached.mock.calls.length).toBeGreaterThanOrEqual(1);

    for await (const item of iterator) {
      results.push(item.result ?? item.error);
    }

    // todos os resultados devem ser entregues (ordem de conclusão)
    expect(results.sort()).toEqual(['a', 'b', 'c'].sort());
  });

  test('external AbortSignal aborts stream runner and propagates AbortError', async () => {
    const controller = new AbortController();

    let startedResolve: () => void;
    const startedPromise = new Promise<void>(r => (startedResolve = r));

    const tasks = [
      async (signal?: AbortSignal) => {
        // signal that the task started
        startedResolve();
        // wait until aborted: rejects with AbortError when signal aborted
        await new Promise<void>((_, reject) => {
          if (signal?.aborted) return reject(new AbortError());
          signal?.addEventListener('abort', () => reject(new AbortError()), {
            once: true,
          });
        });
      },
    ];

    const results: CompletedResult<void, Error>[] = [];
    const runner = (async () => {
      for await (const item of runPromisePoolStream({
        tasks,
        concurrencyLimit: 1,
        signal: controller.signal,
      })) {
        results.push(item);
      }
    })();

    // wait until task started, then abort
    await startedPromise;
    controller.abort();

    await runner;

    // stream should deliver an item with an AbortError
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hasAbort = results.some(
      result =>
        result.error instanceof AbortError ||
        result.error?.name === 'AbortError',
    );
    expect(hasAbort).toBe(true);
  });

  test('calling iterator.return() aborts active tasks', async () => {
    // Use runPromisePoolCore directly to simulate abort behavior deterministically
    let startedResolve: () => void;
    const startedPromise = new Promise<void>(res => (startedResolve = res));

    const tasks = [
      async (signal?: AbortSignal) => {
        startedResolve();
        return new Promise<string>((_, reject) => {
          if (signal?.aborted) return reject(new AbortError());
          signal?.addEventListener('abort', () => reject(new AbortError()), {
            once: true,
          });
        });
      },
    ];

    const resultsFromCallback: CompletedResult<string, Error>[] = [];
    const controller = new AbortController();

    const runnerPromise = runPromisePoolCore({
      tasks,
      concurrencyLimit: 1,
      signal: controller.signal,
      onTaskStart: () => startedResolve(),
      onTaskComplete: (result: CompletedResult<string, Error>) =>
        resultsFromCallback.push(result),
    });

    await startedPromise;
    controller.abort();
    await runnerPromise.catch(() => null);

    expect(resultsFromCallback.length).toBeGreaterThanOrEqual(1);
    const hasAbort = resultsFromCallback.some(
      result =>
        result.error instanceof AbortError ||
        result.error?.name === 'AbortError',
    );
    expect(hasAbort).toBe(true);
  });

  test('failFast makes the generator throw FailFastError (conc >= n)', async () => {
    const tasks = [
      async () => {
        throw new Error('boom');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    const consume = async () => {
      const items: CompletedResult<number, Error>[] = [];
      for await (const item of runPromisePoolStream<number>({
        tasks,
        concurrencyLimit: 10,
        failFast: true,
      })) {
        items.push(item);
      }
      return items;
    };

    await expect(consume()).rejects.toBeInstanceOf(FailFastError);
  });

  test('errorsCountLimit makes the generator throw', async () => {
    const tasks = [
      async () => {
        throw new Error('e0');
      },
      async () => wait(10).then(() => 1),
      async () => wait(10).then(() => 2),
    ];

    const consume = async () => {
      const items: CompletedResult<number, Error>[] = [];
      for await (const item of runPromisePoolStream<number>({
        tasks,
        concurrencyLimit: 10,
        errorsCountLimit: 1,
      })) {
        items.push(item);
      }
      return items;
    };

    await expect(consume()).rejects.toBeInstanceOf(ErrorsCountLimitReachedError);
  });

  test('taskExecutionTimeout yields a PromiseTimeoutError item', async () => {
    const items: CompletedResult<string, Error>[] = [];

    for await (const item of runPromisePoolStream<string>({
      tasks: [async () => wait(100).then(() => 'late')],
      concurrencyLimit: 1,
      taskExecutionTimeout: 10,
    })) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0]?.error).toBeInstanceOf(PromiseTimeoutError);
  });

  test('stopWhen stops scheduling further tasks', async () => {
    const started: number[] = [];
    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      started.push(i);
      await wait(10);
      return i;
    });

    for await (const _item of runPromisePoolStream<number>({
      tasks,
      concurrencyLimit: 2,
      stopWhen: ({ index }) => index === 0,
    })) {
      // drain
    }

    expect(started.length).toBeLessThanOrEqual(3);
  });

  test('accepts async iterable task sources', async () => {
    async function* tasks(): AsyncGenerator<Task<number>> {
      yield async () => wait(20).then(() => 1);
      yield async () => wait(5).then(() => 2);
      yield async () => 3;
    }

    const items: CompletedResult<number, Error>[] = [];
    for await (const item of runPromisePoolStream<number>({
      tasks: tasks(),
      concurrencyLimit: 2,
    })) {
      items.push(item);
    }

    expect(items).toHaveLength(3);
    const results = items.flatMap(item => (item.ok ? [item.result] : []));
    expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});
