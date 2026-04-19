import { timeoutPromise } from './timeout-promise';

// based on benchmarks, but it may vary based on task duration and system resources
export const BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND = 300;

export type Task<T = unknown> = () => Promise<T>;

export type CompletedResult<T, E = Error> =
  | { index: number; result: T; error?: undefined }
  | { index: number; result?: undefined; error: E };

/**
 * Main implementation of promise pool with support for callbacks,
 * early termination, error handling strategies, and task timeouts.
 *
 * Executes a pool of asynchronous tasks with controlled concurrency. *
 *
 * This utility runs a list of async tasks while ensuring that no more than
 * `concurrencyLimit` tasks are executing at the same time. It provides
 * mechanisms for early termination, error handling strategies, timeouts,
 * and lifecycle callbacks for observability and better memory management
 * for large task lists, as it doesn't wait for all tasks to complete before
 * yielding results.
 *
 * @typeParam T - The resolved type of each task result.
 * @typeParam E - The error type that tasks may reject with. Defaults to `Error`.
 *
 * @param params - Configuration object for the promise pool execution.
 *
 * @param params.concurrencyLimit
 * Maximum number of tasks allowed to run concurrently.
 *
 * @param params.tasks
 * An array of functions that return a `Promise<T>`. Each function represents
 * a unit of work to be executed.
 *
 * @param params.failFast
 * When `true`, stops scheduling new tasks as soon as the first error occurs.
 * Already running tasks are allowed to complete.
 * @default false
 *
 * @param params.errorsCountLimit
 * Maximum number of errors allowed before stopping the execution of new tasks.
 * Once this limit is reached, no additional tasks will be started.
 * @default Infinity
 *
 * @param params.taskExecutionTimeout
 * Maximum time (in milliseconds) allowed for each individual task to complete.
 * Tasks exceeding this duration may be aborted or rejected with a timeout error.
 * @default Infinity
 *
 * @param params.stopWhen
 * Optional predicate function that determines whether execution should stop early.
 * It is invoked after each task completion and can inspect results or errors.
 * If it returns `true`, no new tasks will be scheduled.
 *
 * @param params.waitForSpace
 * Optional async function that can be used to signal when it's safe to schedule
 * more tasks, e.g. to manage memory usage for large task lists. It is invoked
 * before starting a new task.
 *
 * @param params.onTaskStart
 * Optional callback invoked when a task starts execution.
 *
 * @param params.onTaskComplete
 * Optional callback invoked when a task completes, regardless of success or failure.
 * Receives the task index and either the result or the error.
 *
 * @param params.onRunningTaskChange
 * Optional callback invoked whenever the number of currently running tasks changes.
 *
 * @returns A promise that resolves with `void` once all scheduled tasks have completed
 * or execution has been stopped based on the configured conditions.
 *
 * @remarks
 * - Tasks are executed concurrently (up to `concurrencyLimit`), not sequentially.
 * - The order of completion is not guaranteed and may differ from the input order.
 * - Early termination options (`failFast`, `errorsCountLimit`, `stopWhen`)
 *   affect only the scheduling of new tasks, not the cancellation of tasks
 *   already in progress (unless explicitly implemented).
 * - Timeout and cancellation behavior depends on the underlying implementation.
 *
 * @example
 * ```ts
 * await runPromisePoolAsync({
 *   concurrencyLimit: 5,
 *   tasks: urls.map(url => () => fetch(url).then(r => r.json())),
 *   failFast: true,
 *   onTaskComplete: ({index, result, error}) => {
 *     if (error) {
 *       console.error(`Task ${index} failed`, error);
 *     } else {
 *       console.log(`Task ${index} finished`, result);
 *     }
 *   },
 * });
 * ```
 */
export async function runPromisePoolAsync<T, E = Error>({
  concurrencyLimit,
  tasks,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout,
  stopWhen,
  waitForSpace,
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  concurrencyLimit: number;
  tasks: Task<T>[];
  failFast?: boolean;
  errorsCountLimit?: number;
  taskExecutionTimeout?: number | undefined;
  stopWhen?: ((completedResult: CompletedResult<T, E>) => boolean) | undefined; // FIXME: nõa funcionar porque shouldStop é local e checado antes da resolução da promise
  waitForSpace?: () => Promise<void>;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (competedResult: CompletedResult<T, E>) => void;
}): Promise<void> {
  let totalErrors = 0;
  const executing: Set<Promise<void>> = new Set();

  let shouldStop = false;
  for (const [index, task] of tasks.entries()) {
    await waitForSpace?.();

    onTaskStart?.(index);

    const promise: Promise<void> = timeoutPromise(task(), taskExecutionTimeout)
      .then(result => {
        onTaskComplete?.({ index, result, error: undefined });
        shouldStop = stopWhen?.({ index, result, error: undefined }) ?? false;
      })
      .catch(error => {
        onTaskComplete?.({ index, result: undefined, error });
        shouldStop = stopWhen?.({ index, result: undefined, error }) ?? false;
        if (failFast) {
          throw new FailFastError(
            `Fail fast enabled, stopping execution due to error in task ${index}`,
          );
        }
        if (++totalErrors >= errorsCountLimit) {
          throw new ErrorsCountLimitReachedError(
            `Error count limit reached: ${totalErrors}`,
          );
        }
      })
      .finally(() => {
        if (executing.has(promise)) executing.delete(promise);
        onRunningTaskChange?.(executing.size);
      });

    if (shouldStop) break;

    executing.add(promise);
    onRunningTaskChange?.(executing.size);

    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

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
