export type Task<T = unknown> = () => Promise<T>;

export type CompletedResult<T, E = Error> =
  | { index: number; result: T; error?: undefined }
  | { index: number; result?: undefined; error: E };

export const BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND = 300; // based on benchmarks, but it may vary based on task duration and system resources

// TODO:
// - add support for task cancellation, with a way to signal cancellation and handle it in the tasks
// - add demo with progress bar line, execution time, error count, running tasks count, last tasked completed, execution list
// - add benchmarks comparing different concurrency limits and ordering options, with various task durations and error rates
// - add type parameter for error type, and return typed errors in the results
// - manage memory usage for very large task lists, e.g. by streaming results or using a generator for tasks instead of an array

export async function* runPromisePoolStream<T, E = Error>({
  tasks,
  bufferLimit,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  onBufferLimitReached,
}: {
  tasks: Task<T>[];
  bufferLimit?: number;
  concurrencyLimit?: number;
  onBufferLimitReached?: () => void;
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
      else await wait(); // async wait to avoid blocking the event loop
    }
    if (runnerError) throw runnerError;
  } finally {
    if (resumeResolver) {
      resumeResolver();
      resumeResolver = undefined;
    }
  }
}


// High memory usage for large task lists, as it waits for all tasks to complete
export async function runPromisePool<T, E = Error>({
  tasks,
  ordering = 'sorted',
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  // failFast = false,
  // errorCountLimit = Infinity,
  // taskExecutionTimeout = Infinity,
  // stopWhen,
  // onTaskStart,
  // onRunningTaskChange,
}: {
  tasks: Task<T>[];
  concurrencyLimit: number;
  ordering?: 'sorted' | 'completion';
  // failFast?: boolean;
  // errorCountLimit?: number;
  // taskExecutionTimeout?: number;
  // stopWhen?: (completedResult: CompletedResult<T, E>) => void;
  // onTaskStart?: (index: number) => void;
  // onRunningTaskChange?: (executingCount: number) => void;
}): Promise<{
  results: Array<T | undefined>;
  errors: Array<E | undefined>;
}> {
  const errors: Array<E | undefined> = new Array(tasks.length);
  const results: Array<T | undefined> = new Array(tasks.length);

  const completionErrors: E[] = [];
  const completionResults: T[] = [];

  const sortedErrors = ordering === 'sorted' ? errors : [];
  const sortedResults = ordering === 'sorted' ? results : [];

  await runPromisePoolAsync({
    // required
    tasks,
    concurrencyLimit,
    // // optional
    // failFast,
    // errorCountLimit,
    // taskExecutionTimeout,
    // required
    onTaskComplete: ({ index, result, error }: CompletedResult<T, E>) => {
      if (error) {
        if (ordering === 'completion') completionErrors.push(error as E);
        else sortedErrors[index] = error;
      } else if (result !== undefined) {
        if (ordering === 'completion') completionResults.push(result);
        else sortedResults[index] = result;
      }
    },
    // // optional
    // stopWhen,
    // onTaskStart,
    // onRunningTaskChange,
  });

  if (ordering === 'sorted')
    return { errors: sortedErrors, results: sortedResults };
  return { errors: completionErrors, results: completionResults };
}

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
 * @param params.errorCountLimit
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
 * - Early termination options (`failFast`, `errorCountLimit`, `stopWhen`)
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
  //TODO: implement the following options:
  // // TODO: add timeout option for tasks that take too long, with error handling
  // failFast = false,
  // // TODO: add option to stop executing new tasks if a certain number of errors occur, or if a specific error is encountered
  // errorCountLimit = Infinity,
  // // TODO: add timeout option for tasks that take too long, with error handling
  // taskExecutionTimeout = Infinity,
  // // TODO: add option to stop executing new tasks based on a custom condition, e.g. a specific result or error is encountered
  // stopWhen,
  waitForSpace,
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  concurrencyLimit: number;
  tasks: Task<T>[];
  // failFast?: boolean;
  // errorCountLimit?: number;
  // taskExecutionTimeout?: number;
  // stopWhen?: ((completedResult: CompletedResult<T, E>) => void) | undefined;
  waitForSpace?: () => Promise<void>;
  onTaskStart?: ((index: number) => void) | undefined;
  onRunningTaskChange?: ((executingCount: number) => void) | undefined;
  onTaskComplete?: (competedResult: CompletedResult<T, E>) => void;
}): Promise<void> {
  const executing: Set<Promise<void>> = new Set();
  for (const [index, task] of tasks.entries()) {
    await waitForSpace?.();

    onTaskStart?.(index);
    const promise: Promise<void> = task()
      .then(result => onTaskComplete?.({ index, result, error: undefined }))
      .catch(error => onTaskComplete?.({ index, result: undefined, error }))
      .finally(() => {
        if (executing.has(promise)) executing.delete(promise);
        onRunningTaskChange?.(executing.size);
      });

    executing.add(promise);
    onRunningTaskChange?.(executing.size);

    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}
