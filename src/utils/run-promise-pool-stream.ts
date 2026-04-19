import {
  BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  type CompletedResult,
  runPromisePoolAsync,
  type Task,
} from './run-promise-pool-async';
import { wait } from './wait';

export async function* runPromisePoolStream<T, E = Error>({
  tasks,
  bufferLimit,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  onBufferLimitReached,
  signal,
}: {
  tasks: Task<T>[];
  bufferLimit?: number;
  concurrencyLimit?: number;
  onBufferLimitReached?: () => void;
  signal?: AbortSignal;
}): AsyncGenerator<CompletedResult<T, E>> {
  let completed = false;
  let runnerError: E | undefined;
  const queue: CompletedResult<T, E>[] = [];

  let resumeResolver: (() => void) | undefined;
  const waitForSpace = async () => {
    if (!bufferLimit) return;
    if (queue.length < bufferLimit) return;
    onBufferLimitReached?.();
    await new Promise<void>(resolve => {
      resumeResolver = resolve;
    });
  };

  runPromisePoolAsync({
    tasks,
    concurrencyLimit,
    waitForSpace,
    signal,
    onTaskComplete: ({ index, result, error }) =>
      queue.push({ index, result, error } as CompletedResult<T, E>),
  })
    .catch((e: E) => (runnerError = e))
    .finally(() => (completed = true));

  try {
    while (true) {
      if (queue.length > 0) {
        const item = queue.shift()!;
        if (resumeResolver && bufferLimit && queue.length < bufferLimit) {
          resumeResolver();
          resumeResolver = undefined;
        }
        yield item;
      } else if (completed) break;
      else await wait(0); // async wait to avoid blocking the event loop
    }
    if (runnerError) throw runnerError;
  } finally {
    if (resumeResolver) {
      resumeResolver();
      resumeResolver = undefined;
    }
  }
}
