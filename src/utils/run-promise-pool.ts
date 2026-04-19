import { timeoutPromise } from './timeout-promise';

// based on benchmarks, but it may vary based on task duration and system resources
export const BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND = 300;

export type Task<T = unknown> = (signal?: AbortSignal) => Promise<T>;

export type CompletedResult<T, E = Error> =
  | { index: number; result: T; error?: undefined }
  | { index: number; result?: undefined; error: E };

/**
 * Main implementation of the promise pool with support for callbacks,
 * early termination, error handling strategies, per-task timeouts and
 * cooperative cancellation via `AbortSignal`.
 *
 * Executes a list of asynchronous `tasks` with controlled concurrency. The
 * implementation normalizes the provided `concurrencyLimit` using
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
 * An array of functions that return a `Promise<T>`. Each function receives an
 * optional `AbortSignal` parameter and may opt-in to cooperative cancellation.
 *
 * @param params.failFast
 * When `true`, the pool stops scheduling new tasks and rethrows the first
 * failure (the returned `Promise` rejects). Important: `failFast` does **not**
 * abort tasks that are already running — those tasks are allowed to complete
 * unless they observe an external `AbortSignal`.
 * @default false
 *
 * @param params.errorsCountLimit
 * Maximum number of errors allowed before the pool surfaces an
 * `ErrorsCountLimitReachedError`. When reached, scheduling stops and the
 * error is thrown.
 * @default Infinity
 *
 * @param params.abortOnErrorsLimit
 * When `true`, the pool will call `AbortController.abort()` when
 * `errorsCountLimit` is reached, signalling cancellation to tasks that
 * observe the provided `AbortSignal`. Default: `false` (do not abort running tasks).
 *
 * @param params.taskExecutionTimeout
 * Maximum time (in milliseconds) allowed for each individual task to complete.
 * Tasks exceeding this duration are rejected with a timeout error from
 * `timeoutPromise` and treated like other task failures.
 * @default Infinity
 *
 * @param params.stopWhen
 * Optional predicate invoked after each task completes; if it returns `true`
 * the pool will stop scheduling new tasks.
 *
 * @param params.waitForSpace
 * Optional async function invoked before starting a new task. Useful for
 * applying backpressure (e.g. when a downstream consumer is buffering results).
 *
 * @param params.signal
 * Optional `AbortSignal` that, when aborted, signals cancellation to the pool
 * and to tasks that accept and respect the signal.
 *
 * @param params.onTaskStart
 * Optional callback invoked when a task starts execution.
 *
 * @param params.onTaskComplete
 * Optional callback invoked when a task completes (success or failure).
 * Receives the `CompletedResult` with `index` and either `result` or `error`.
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
  concurrencyLimit,
  // abortion and error handling options
  signal,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout,
  stopWhen,
  // advanced options for better memory management with large task lists
  waitForSpace,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
  // behavior flags
  abortOnErrorsLimit = false,
}: {
  concurrencyLimit: number;
  tasks: Task<T>[];
  failFast?: boolean;
  errorsCountLimit?: number;
  taskExecutionTimeout?: number | undefined;
  stopWhen?: ((completedResult: CompletedResult<T, E>) => boolean) | undefined;
  signal?: AbortSignal | undefined;
  waitForSpace?: () => Promise<void>;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (completedResult: CompletedResult<T, E>) => void;
  abortOnErrorsLimit?: boolean;
}): Promise<void> {
  let totalErrors = 0;
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

  let shouldStop = false;
  for (const [index, task] of tasks.entries()) {
    if (shouldStop || controller.signal.aborted) break;

    await waitForSpace?.();

    onTaskStart?.(index);

    const promise: Promise<void> = timeoutPromise(
      // pass abort signal to the task so it can opt-in to cancellation
      task(controller.signal),
      taskExecutionTimeout,
      controller.signal,
    )
      .then(result => {
        onTaskComplete?.({ index, result });
        shouldStop = stopWhen?.({ index, result }) ?? false;
        if (shouldStop) controller.abort();
      })
      .catch(error => {
        onTaskComplete?.({ index, error });
        shouldStop = stopWhen?.({ index, error }) ?? false;
        if (shouldStop) controller.abort();
        if (failFast) {
          // Fail-fast: stop scheduling new tasks and surface error, but do
          // not abort other already-running tasks. This preserves the
          // invariant that failFast controls scheduling, not active task
          // cancellation.
          throw new FailFastError(
            `Fail fast enabled, stopping execution due to error in task ${index}`,
          );
        }
        if (++totalErrors >= errorsCountLimit) {
          if (abortOnErrorsLimit) controller.abort();
          throw new ErrorsCountLimitReachedError(
            `Error count limit reached: ${totalErrors}`,
          );
        }
      })
      .finally(() => {
        if (executing.has(promise)) executing.delete(promise);
        onRunningTaskChange?.(executing.size);
      });

    if (shouldStop || controller.signal.aborted) break;

    executing.add(promise);
    onRunningTaskChange?.(executing.size);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
      // checar novamente após aguardar uma conclusão: se `stopWhen` foi acionado
      // por uma task que acabou de completar, devemos respeitar e parar o loop.
      if (shouldStop || controller.signal.aborted) break;
    }
  }
  await Promise.all(executing);
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
