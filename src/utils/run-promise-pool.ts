import { AbortError, timeoutPromise } from './timeout-promise';

// based on benchmarks, but it may vary based on task duration and system resources
export const BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND = 300;

export type Task<T = unknown> = (signal?: AbortSignal) => Promise<T>;
export type TaskIterable<T = unknown> = Iterable<Task<T>> | AsyncIterable<Task<T>>;
export type RetryContext<E = Error> = {
  error: E;
  attempt: number;
  index: number;
};
export type RetryDelay<E = Error> =
  | number
  | ((context: RetryContext<E>) => number | Promise<number>);
export type ShouldRetry<E = Error> = (
  context: RetryContext<E>,
) => boolean | Promise<boolean>;

export type CompletedResult<T, E = Error> =
  | { index: number; ok: true; result: T; error?: undefined }
  | { index: number; ok: false; result?: undefined; error: E };

/**
 * Main implementation of the promise pool with support for callbacks,
 * early termination, error handling strategies, per-task timeouts and
 * cooperative cancellation via `AbortSignal`.
 *
 * Executes an iterable or async iterable of asynchronous `tasks` with
 * controlled concurrency. The implementation normalizes the provided
 * `concurrencyLimit` using
 * `Math.floor` (non-integer values are rounded down) and requires a value
 * >= 1.
 *
 * @typeParam T - The resolved type of each task result.
 * @typeParam E - The error type that tasks may reject with. Defaults to `Error`.
 *
 * @param params - Configuration object for the promise pool execution.
 *
 * @param params.concurrencyLimit
 * Maximum number of tasks allowed to run concurrently. Non-integer values are
 * floored (e.g. `2.9` -> `2`). A `RangeError` is thrown if the resulting
 * concurrency is less than 1.
 *
 * @param params.tasks
 * An iterable or async iterable of functions that return a `Promise<T>`. Each
 * function receives an optional `AbortSignal` parameter and may opt-in to
 * cooperative cancellation.
 *
 * @param params.failFast
 * When `true`, the first task failure stops the scheduling of new tasks and
 * causes the returned `Promise` to reject with a `FailFastError`. Important:
 * `failFast` does **not** abort tasks that are already running — those are
 * allowed to complete (unless they observe an external `AbortSignal`), and the
 * rejection is surfaced only **after** every in-flight task has settled, so the
 * pool never resolves while work is still running.
 * @default false
 *
 * @param params.abortOnFailFast
 * When `true`, the pool will call `AbortController.abort()` after the first
 * task failure while `failFast` is enabled, signalling cancellation to
 * in-flight tasks that observe the provided `AbortSignal`. Default: `false`
 * (do not abort running tasks).
 *
 * @param params.errorsCountLimit
 * Maximum number of errors allowed before the pool surfaces an
 * `ErrorsCountLimitReachedError`. When reached, scheduling stops and the error
 * is surfaced after in-flight tasks settle (the returned `Promise` rejects).
 * @default Infinity
 *
 * @param params.abortOnErrorsLimit
 * When `true`, the pool will call `AbortController.abort()` when
 * `errorsCountLimit` is reached, signalling cancellation to tasks that
 * observe the provided `AbortSignal`. Default: `false` (do not abort running tasks).
 *
 * @param params.taskExecutionTimeout
 * Maximum time (in milliseconds) allowed for each individual task to complete.
 * Each retry attempt gets its own timeout. Tasks exceeding this duration are
 * rejected with a timeout error from `timeoutPromise` and treated like other
 * task failures.
 * @default Infinity
 *
 * @param params.retryCount
 * Number of extra attempts after the first failure. `0` means no retries.
 * A `RangeError` is thrown for non-finite, negative or non-integer values.
 * @default 0
 *
 * @param params.retryDelay
 * Optional delay in milliseconds before each retry, or a function that receives
 * `{ error, attempt, index }`. `attempt` is 1-based and represents the failed
 * attempt that is about to be retried.
 *
 * @param params.shouldRetry
 * Optional predicate that receives `{ error, attempt, index }`. Return `false`
 * to stop retrying and surface the error. If the predicate throws, the task is
 * not retried.
 *
 * @param params.stopWhen
 * Optional predicate invoked after each task completes. If it returns `true`
 * the pool stops scheduling new tasks **and** calls `AbortController.abort()`,
 * signalling cancellation to in-flight tasks that observe the `AbortSignal`
 * (those tasks reject with an `AbortError`, reported via `onTaskComplete`).
 * If the predicate itself throws, it is treated as `false` (do not stop).
 *
 * @param params.waitForSpace
 * Optional async function invoked before starting a new task. Useful for
 * applying backpressure (e.g. when a downstream consumer is buffering results).
 * A throw/rejection here is ignored (the pool proceeds without waiting).
 *
 * @param params.signal
 * Optional `AbortSignal` that, when aborted, signals cancellation to the pool
 * and to tasks that accept and respect the signal.
 *
 * Notification callbacks (`onTaskStart`, `onTaskComplete`, `onRunningTaskChange`)
 * are isolated: if one throws, the error is ignored and the pool keeps running.
 *
 * @param params.onTaskStart
 * Optional callback invoked when a task starts execution.
 *
 * @param params.onTaskComplete
 * Optional callback invoked when a task completes (success or failure). Receives
 * the `CompletedResult`; discriminate with `ok` (`true` → `result`, `false` →
 * `error`).
 *
 * @param params.onRunningTaskChange
 * Optional callback invoked whenever the number of currently running tasks changes.
 *
 * @returns A promise that resolves with `void` once all scheduled tasks have
 * completed or execution has been stopped based on the configured conditions.
 */
export async function runPromisePoolCore<T, E = Error>({
  // basic required options
  tasks,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  // abortion and error handling options
  signal,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout,
  retryCount = 0,
  retryDelay = 0,
  shouldRetry,
  stopWhen,
  // advanced options for better memory management with large task lists
  waitForSpace,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
  // behavior flags
  abortOnErrorsLimit = false,
  abortOnFailFast = false,
}: {
  concurrencyLimit?: number;
  tasks: TaskIterable<T>;
  failFast?: boolean;
  abortOnFailFast?: boolean;
  errorsCountLimit?: number;
  taskExecutionTimeout?: number | undefined;
  retryCount?: number;
  retryDelay?: RetryDelay<E>;
  shouldRetry?: ShouldRetry<E>;
  stopWhen?: ((completedResult: CompletedResult<T, E>) => boolean) | undefined;
  signal?: AbortSignal | undefined;
  waitForSpace?: () => Promise<void>;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (completedResult: CompletedResult<T, E>) => void;
  abortOnErrorsLimit?: boolean;
}): Promise<void> {
  let totalErrors = 0;
  // Terminal error captured by `failFast` / `errorsCountLimit`. It is recorded
  // here instead of thrown inside the task's `.catch` so that each task promise
  // always resolves and is never removed from `executing` before being awaited.
  // (Throwing there could let the rejection be swallowed AND surface as an
  // unhandledRejection whenever the initial batch fills the whole task source.)
  let poolError: Error | undefined;
  // Normalize and validate concurrencyLimit early to avoid deadlocks when
  // using `Promise.race(executing)` with an empty set. Non-integer values
  // are floored to the nearest lower integer.
  if (!Number.isFinite(concurrencyLimit)) {
    throw new RangeError(
      'concurrencyLimit must be a finite number greater than 0',
    );
  }
  const concurrency = Math.floor(concurrencyLimit);
  if (concurrency < 1) {
    throw new RangeError(
      'concurrencyLimit must be a finite number greater than 0',
    );
  }
  if (
    !Number.isFinite(retryCount) ||
    retryCount < 0 ||
    !Number.isInteger(retryCount)
  ) {
    throw new RangeError('retryCount must be a non-negative integer');
  }
  // controller used to signal cancellation to tasks that respect AbortSignal
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    else {
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  const executing: Set<Promise<void>> = new Set();

  // User callbacks must never corrupt the pool's control flow: a throwing
  // notification callback is isolated, and a throwing `stopWhen` is treated as
  // `false` (do not stop).
  const notify = (fn: (() => void) | undefined) => {
    if (!fn) return;
    try {
      fn();
    } catch {
      // ignore: an observer callback must not break the pool
    }
  };
  const isStop = (completed: CompletedResult<T, E>): boolean => {
    if (!stopWhen) return false;
    try {
      return stopWhen(completed);
    } catch {
      return false;
    }
  };

  let shouldStop = false;
  let index = 0;
  for await (const task of tasks) {
    const taskIndex = index++;
    if (shouldStop || controller.signal.aborted) break;

    try {
      await waitForSpace?.();
    } catch {
      // ignore: a throwing backpressure hook must not break the pool
    }

    notify(() => onTaskStart?.(taskIndex));

    const promise: Promise<void> = runTaskWithRetries({
      task,
      index: taskIndex,
      retryCount,
      retryDelay,
      shouldRetry,
      signal: controller.signal,
      taskExecutionTimeout,
    })
      .then(result => {
        const completed: CompletedResult<T, E> = {
          index: taskIndex,
          ok: true,
          result,
        };
        notify(() => onTaskComplete?.(completed));
        if (isStop(completed)) {
          shouldStop = true;
          controller.abort();
        }
      })
      .catch(error => {
        const completed: CompletedResult<T, E> = {
          index: taskIndex,
          ok: false,
          error,
        };
        notify(() => onTaskComplete?.(completed));
        if (isStop(completed)) {
          shouldStop = true;
          controller.abort();
        }
        if (failFast) {
          // Fail-fast: stop scheduling new tasks and surface the error, but do
          // not abort already-running tasks unless `abortOnFailFast` is true.
          // We record the error instead of throwing so this promise still
          // resolves; it is rethrown after `Promise.all`.
          shouldStop = true;
          if (abortOnFailFast) controller.abort();
          poolError ??= new FailFastError(
            `Fail fast enabled, stopping execution due to error in task ${taskIndex}`,
          );
          return;
        }
        if (++totalErrors >= errorsCountLimit) {
          shouldStop = true;
          if (abortOnErrorsLimit) controller.abort();
          poolError ??= new ErrorsCountLimitReachedError(
            `Error count limit reached: ${totalErrors}`,
          );
        }
      })
      .finally(() => {
        executing.delete(promise);
        notify(() => onRunningTaskChange?.(executing.size));
      });

    if (shouldStop || controller.signal.aborted) break;

    executing.add(promise);
    notify(() => onRunningTaskChange?.(executing.size));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
      // checar novamente após aguardar uma conclusão: se `stopWhen` foi acionado
      // por uma task que acabou de completar, devemos respeitar e parar o loop.
      if (shouldStop || controller.signal.aborted) break;
    }
  }
  await Promise.all(executing);
  // Surface the terminal error (failFast / errorsCountLimit) only after every
  // in-flight task has settled, so the returned promise never resolves while
  // tasks are still running and never leaks an unhandledRejection.
  if (poolError) throw poolError;
}

async function runTaskWithRetries<T, E>({
  task,
  index,
  retryCount,
  retryDelay,
  shouldRetry,
  signal,
  taskExecutionTimeout,
}: {
  task: Task<T>;
  index: number;
  retryCount: number;
  retryDelay: RetryDelay<E>;
  shouldRetry: ShouldRetry<E> | undefined;
  signal: AbortSignal;
  taskExecutionTimeout: number | undefined;
}): Promise<T> {
  let retriesUsed = 0;

  while (true) {
    try {
      return await timeoutPromise(
        invokeTask(task, signal),
        taskExecutionTimeout,
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;

      const attempt = retriesUsed + 1;
      if (attempt > retryCount) throw error;

      const context: RetryContext<E> = {
        error: error as E,
        attempt,
        index,
      };

      if (!(await canRetry(shouldRetry, context))) throw error;

      await waitForRetryDelay(retryDelay, context, signal);
      retriesUsed++;
    }
  }
}

function invokeTask<T>(task: Task<T>, signal: AbortSignal): Promise<T> {
  try {
    return task(signal);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function canRetry<E>(
  shouldRetry: ShouldRetry<E> | undefined,
  context: RetryContext<E>,
): Promise<boolean> {
  if (!shouldRetry) return true;
  try {
    return await shouldRetry(context);
  } catch {
    return false;
  }
}

async function waitForRetryDelay<E>(
  retryDelay: RetryDelay<E>,
  context: RetryContext<E>,
  signal: AbortSignal,
): Promise<void> {
  let delay: number;
  try {
    delay =
      typeof retryDelay === 'function' ? await retryDelay(context) : retryDelay;
  } catch {
    throw context.error;
  }

  if (!Number.isFinite(delay) || delay <= 0) return;

  await new Promise<void>((resolve, reject) => {
    let id: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (id !== undefined) clearTimeout(id);
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new AbortError());
    };

    if (signal.aborted) return onAbort();
    id = setTimeout(() => {
      cleanup();
      resolve();
    }, delay);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// backward-compatible alias: `runPromisePool` remains available for callers
export const runPromisePool = runPromisePoolCore;

export class FailFastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FailFastError';
    this.message = message;
  }
}

export class ErrorsCountLimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorsCountLimitReachedError';
    this.message = message;
  }
}
