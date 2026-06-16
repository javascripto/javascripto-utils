import {
  BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  type CompletedResult,
  type RetryDelay,
  runPromisePoolCore,
  type ShouldRetry,
  type TaskIterable,
} from './run-promise-pool';

/**
 * Promise pool exposed as an `AsyncGenerator`: yields each `CompletedResult`
 * (success or error) **as soon as the task settles**, in completion order.
 *
 * `tasks` may be an array, iterable, or async iterable. Ideal for pipelines and
 * large/unbounded producers — you consume at your own pace and at most
 * `bufferLimit` completed items are held in memory at a time.
 *
 * @param params.bufferLimit
 * Maximum number of completed-but-not-yet-consumed items. While the buffer is
 * full the pool stops scheduling new tasks (backpressure).
 *
 * @param params.onBufferLimitReached
 * Invoked when the buffer fills up.
 *
 * Cancellation: leaving the `for await` loop (`break` / `return` / throw) aborts
 * the internal runner; active tasks that observe the `AbortSignal` reject with
 * `AbortError`.
 *
 * See {@link runPromisePoolCore} for the shared options (`failFast`,
 * `errorsCountLimit`, `taskExecutionTimeout`, `stopWhen`, `signal`, callbacks)
 * and `run-promise-pool.md` for the full guide.
 */
export async function* runPromisePoolStream<T, E = Error>({
  // basic required options
  tasks,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  // backpressure options
  bufferLimit,
  onBufferLimitReached,
  // behavior flags
  abortOnErrorsLimit = false,
  abortOnFailFast = false,
  // abortion and error handling options
  signal,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout,
  retryCount = 0,
  retryDelay = 0,
  shouldRetry,
  stopWhen,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  tasks: TaskIterable<T>;
  concurrencyLimit?: number;
  signal?: AbortSignal;
  bufferLimit?: number;
  onBufferLimitReached?: () => void;
  failFast?: boolean;
  abortOnFailFast?: boolean;
  errorsCountLimit?: number;
  abortOnErrorsLimit?: boolean;
  taskExecutionTimeout?: number | undefined;
  retryCount?: number;
  retryDelay?: RetryDelay<E>;
  shouldRetry?: ShouldRetry<E>;
  stopWhen?: ((completedResult: CompletedResult<T, E>) => boolean) | undefined;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (completedResult: CompletedResult<T, E>) => void;
}): AsyncGenerator<CompletedResult<T, E>> {
  let completed = false;
  let runnerError: E | undefined;
  const queue: CompletedResult<T, E>[] = [];
  let wakeResolver: (() => void) | undefined;

  const wake = () => {
    wakeResolver?.();
    wakeResolver = undefined;
  };

  const waitForWake = async () => {
    await new Promise<void>(resolve => {
      wakeResolver = resolve;
    });
  };

  // local controller used to abort the internal runner when the consumer
  // stops the generator (via `return()` / cancellation).
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    else
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
  }

  let resumeResolver: (() => void) | undefined;
  const waitForSpace = async () => {
    if (!bufferLimit) return;
    if (queue.length < bufferLimit) return;
    onBufferLimitReached?.();
    await new Promise<void>(resolve => {
      resumeResolver = resolve;
    });
  };

  const runnerPromise = runPromisePoolCore({
    tasks,
    concurrencyLimit,
    waitForSpace,
    signal: controller.signal,
    failFast,
    abortOnFailFast,
    errorsCountLimit,
    abortOnErrorsLimit,
    taskExecutionTimeout,
    retryCount,
    retryDelay,
    ...(shouldRetry ? { shouldRetry } : {}),
    stopWhen,
    onTaskStart,
    onRunningTaskChange,
    onTaskComplete: (completedResult: CompletedResult<T, E>) => {
      // Queue first so the consumer always receives the item, even if the
      // user's onTaskComplete throws (it is isolated by the core).
      queue.push(completedResult);
      wake();
      onTaskComplete?.(completedResult);
    },
  })
    .catch((e: E) => (runnerError = e))
    .finally(() => {
      completed = true;
      wake();
    });

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
      else await waitForWake();
    }
    if (runnerError) throw runnerError;
  } finally {
    // If the consumer stops the generator (calls `return()`), abort the
    // underlying runner so active tasks that observe the signal get cancelled.
    if (!controller.signal.aborted) controller.abort();
    // resolve any waiters so the runner can make progress and invoke
    // `onTaskComplete` (which pushes into `queue`) before we finish.
    if (resumeResolver) {
      resumeResolver();
      resumeResolver = undefined;
    }
    wake();
    // wait for the internal runner to finish processing so queued callbacks
    // are delivered to the consumer in a deterministic manner. Swallow
    // errors here since they'll be rethrown above if needed.
    try {
      await runnerPromise.catch(() => null);
    } catch {
      // ignored
    }
  }
}
