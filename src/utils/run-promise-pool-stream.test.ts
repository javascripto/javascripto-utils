import { describe, expect, test, vi } from 'vitest';
import { runPromisePoolStream } from './run-promise-pool-stream';
import { AbortError } from './timeout-promise';
import { wait } from './wait';

describe('runPromisePoolStream', () => {
  test('yields completed results and respects bufferLimit/backpressure', async () => {
    const tasks = [
      () => wait(30).then(() => 'a'),
      () => wait(10).then(() => 'b'),
      () => wait(5).then(() => 'c'),
    ];

    const onBufferLimitReached = vi.fn();

    const results: Array<unknown> = [];
    for await (const item of runPromisePoolStream({
      tasks,
      concurrencyLimit: 2,
      bufferLimit: 1,
      onBufferLimitReached,
    })) {
      results.push(item.result ?? item.error);
    }

    // deve ter chamado o callback de backpressure ao menos uma vez
    expect(onBufferLimitReached.mock.calls.length).toBeGreaterThanOrEqual(1);
    // todos os resultados devem ser entregues (ordem de conclusão)
    expect(results.sort()).toEqual(['a', 'b', 'c'].sort());
  });

  test('external AbortSignal aborts stream runner and propagates AbortError', async () => {
    const controller = new AbortController();
    const tasks = [
      async () => {
        await wait(100);
        return 'a';
      },
    ];

    setTimeout(() => controller.abort(), 10);

    const results: any[] = [];
    for await (const item of runPromisePoolStream({
      tasks,
      concurrencyLimit: 1,
      signal: controller.signal,
    })) {
      results.push(item);
    }

    // stream should deliver an item with an AbortError
    expect(results.length).toBeGreaterThanOrEqual(1);
    const hasAbort = results.some(
      r => r.error && r.error instanceof AbortError,
    );
    expect(hasAbort).toBe(true);
  });
});
