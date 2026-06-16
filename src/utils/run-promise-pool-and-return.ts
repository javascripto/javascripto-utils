import {
  BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  type CompletedResult,
  type RetryDelay,
  runPromisePoolCore,
  type ShouldRetry,
  type TaskIterable,
} from './run-promise-pool';

/**
 * High-level promise pool that runs `tasks` with controlled concurrency and
 * **collects every outcome in memory**, returning `{ results, errors }`. Think
 * of it as `Promise.allSettled` with a concurrency limit and index-aware output.
 *
 * `tasks` may be an array, iterable, or async iterable. Memory is O(n) in the
 * number of completed tasks, since it waits for all of them to complete — for
 * very large or unbounded workloads prefer
 * `runPromisePoolStream` or `runPromisePoolCore`.
 *
 * @param params.ordering
 * - `'sorted'` (default): `results[i]` / `errors[i]` align with the input index;
 *   for known-size sources, `results.length` matches the input size and failed
 *   slots stay `undefined`.
 * - `'completion'`: pushed in completion order, with no positional alignment.
 *
 * Note: for task sources without a known `length`/`size`, `ordering: 'sorted'`
 * can only size the arrays up to the highest scheduled index. Arrays/Sets keep
 * their known size even if scheduling stops early.
 *
 * See {@link runPromisePoolCore} for the shared options (`failFast`,
 * `errorsCountLimit`, `taskExecutionTimeout`, `stopWhen`, `signal`, callbacks)
 * and `run-promise-pool.md` for the full guide.
 *
 * @returns `{ results, errors }` — layout depends on `ordering`.
 */
export async function runPromisePoolAndReturn<T, E = Error>({
  // basic required options
  tasks,
  concurrencyLimit = BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  // result ordering options
  ordering = 'sorted',
  // abortion, timeout and error handling options
  signal,
  failFast = false,
  errorsCountLimit = Infinity,
  taskExecutionTimeout = undefined,
  retryCount = 0,
  retryDelay = 0,
  shouldRetry,
  stopWhen,
  abortOnFailFast = false,
  abortOnErrorsLimit = false,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  tasks: TaskIterable<T>;
  concurrencyLimit?: number;
  ordering?: 'sorted' | 'completion';
  failFast?: boolean;
  abortOnFailFast?: boolean;
  errorsCountLimit?: number;
  taskExecutionTimeout?: number;
  retryCount?: number;
  retryDelay?: RetryDelay<E>;
  shouldRetry?: ShouldRetry<E>;
  stopWhen?: (completedResult: CompletedResult<T, E>) => boolean;
  signal?: AbortSignal;
  onTaskStart?: (index: number) => void;
  onTaskComplete?: (completedResult: CompletedResult<T, E>) => void;
  onRunningTaskChange?: (executingCount: number) => void;
  abortOnErrorsLimit?: boolean;
}): Promise<{
  results: Array<T | undefined>;
  errors: Array<E | undefined>;
}> {
  const taskCount = getKnownTaskCount(tasks);
  const errors: Array<E | undefined> =
    taskCount === undefined ? [] : new Array(taskCount);
  const results: Array<T | undefined> =
    taskCount === undefined ? [] : new Array(taskCount);

  const completionErrors: E[] = [];
  const completionResults: Array<T | undefined> = [];

  const sortedErrors = ordering === 'sorted' ? errors : [];
  const sortedResults = ordering === 'sorted' ? results : [];

  await runPromisePoolCore({
    tasks,
    concurrencyLimit,
    failFast,
    errorsCountLimit,
    taskExecutionTimeout,
    retryCount,
    retryDelay,
    ...(shouldRetry ? { shouldRetry } : {}),
    signal,
    stopWhen,
    abortOnFailFast,
    onTaskStart,
    onRunningTaskChange,
    abortOnErrorsLimit,
    onTaskComplete: (completed: CompletedResult<T, E>) => {
      // Discriminate by the `ok` flag so that falsy rejection reasons
      // (e.g. `throw 0`) and tasks that resolve to `undefined` are recorded
      // correctly. Note: the returned arrays still cannot represent an
      // `undefined` rejection reason distinctly from a successful `undefined`
      // result — use `onTaskComplete` (which receives `ok`) if you need that.
      if (completed.ok) {
        if (ordering === 'completion') completionResults.push(completed.result);
        else {
          sortedResults[completed.index] = completed.result;
          sortedErrors[completed.index] = undefined;
        }
      } else {
        if (ordering === 'completion') completionErrors.push(completed.error);
        else {
          sortedErrors[completed.index] = completed.error;
          sortedResults[completed.index] = undefined;
        }
      }
      onTaskComplete?.(completed);
    },
  });

  if (ordering === 'sorted')
    return { errors: sortedErrors, results: sortedResults };
  return { errors: completionErrors, results: completionResults };
}

function getKnownTaskCount<T>(tasks: TaskIterable<T>): number | undefined {
  const maybeSized = tasks as { length?: unknown; size?: unknown };
  const count =
    typeof maybeSized.length === 'number'
      ? maybeSized.length
      : maybeSized.size;

  if (
    typeof count === 'number' &&
    Number.isSafeInteger(count) &&
    count >= 0
  ) {
    return count;
  }
}
