import {
  BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  type CompletedResult,
  runPromisePoolCore,
  type Task,
} from './run-promise-pool';
import { wait } from './wait';

export async function* runPromisePoolStream<T, E = Error>({
  // basic required options
  tasks,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  // backpressure options
  bufferLimit,
  onBufferLimitReached,
  // behavior flags
  abortOnErrorsLimit = false,
  // abortion and error handling options
  signal,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout,
  stopWhen,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  tasks: Task<T>[];
  concurrencyLimit?: number;
  signal?: AbortSignal;
  bufferLimit?: number;
  onBufferLimitReached?: () => void;
  failFast?: boolean;
  errorsCountLimit?: number;
  abortOnErrorsLimit?: boolean;
  taskExecutionTimeout?: number | undefined;
  stopWhen?: ((completedResult: CompletedResult<T, E>) => boolean) | undefined;
  waitForSpace?: () => Promise<void>;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (completedResult: CompletedResult<T, E>) => void;
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

  runPromisePoolCore({
    tasks,
    concurrencyLimit,
    waitForSpace,
    signal,
    failFast,
    errorsCountLimit,
    abortOnErrorsLimit,
    taskExecutionTimeout,
    stopWhen,
    onTaskStart,
    onRunningTaskChange,
    onTaskComplete: (completedResult: CompletedResult<T, E>) => {
      onTaskComplete?.(completedResult);
      queue.push(completedResult);
    },
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
