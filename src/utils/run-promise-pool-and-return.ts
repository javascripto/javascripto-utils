import {
  BEST_BENCHMARK_CONCURRENCY_LIMIT_FOUND,
  type CompletedResult,
  runPromisePoolCore,
  type Task,
} from './run-promise-pool';

// TODO:
// - add demo with progress bar line, execution time, error count, running tasks count, last tasked completed, execution list
// - add benchmarks comparing different concurrency limits and ordering options, with various task durations and error rates
// - write tests covering various scenarios, including edge cases like all tasks failing, all tasks succeeding, mix of fast and slow tasks, etc.
// - add description and jsdocs

// High memory usage for large task lists, as it waits for all tasks to complete
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
  stopWhen,
  abortOnErrorsLimit = false,
  // lifecycle callbacks
  onTaskStart,
  onTaskComplete,
  onRunningTaskChange,
}: {
  tasks: Task<T>[];
  concurrencyLimit: number;
  ordering?: 'sorted' | 'completion';
  failFast?: boolean;
  errorsCountLimit?: number;
  taskExecutionTimeout?: number;
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
  const errors: Array<E | undefined> = new Array(tasks.length);
  const results: Array<T | undefined> = new Array(tasks.length);

  const completionErrors: E[] = [];
  const completionResults: T[] = [];

  const sortedErrors = ordering === 'sorted' ? errors : [];
  const sortedResults = ordering === 'sorted' ? results : [];

  await runPromisePoolCore({
    tasks,
    concurrencyLimit,
    failFast,
    errorsCountLimit,
    taskExecutionTimeout,
    signal,
    stopWhen,
    onTaskStart,
    onRunningTaskChange,
    abortOnErrorsLimit,
    onTaskComplete: ({ index, result, error }: CompletedResult<T, E>) => {
      if (error) {
        onTaskComplete?.({ index, error });
        if (ordering === 'completion') completionErrors.push(error);
        else sortedErrors[index] = error;
      } else if (result !== undefined) {
        onTaskComplete?.({ index, result });
        if (ordering === 'completion') completionResults.push(result);
        else sortedResults[index] = result;
      }
    },
  });

  if (ordering === 'sorted')
    return { errors: sortedErrors, results: sortedResults };
  return { errors: completionErrors, results: completionResults };
}
