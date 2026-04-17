export type Task<T = unknown> = () => Promise<T>;

export async function runPromisePool<T>({
  concurrencyLimit,
  tasks,
  ordering = 'sorted',
}: {
  concurrencyLimit: number;
  tasks: Task<T>[];
  ordering?: 'sorted' | 'completion';
}): Promise<{
  results: Array<T | undefined>;
  errors: Array<unknown | undefined>;
}> {
  const results: Array<T | undefined> = new Array(tasks.length);
  const completionResults: T[] = [];
  const errors: Array<unknown | undefined> = new Array(tasks.length);
  const sortedResults = ordering === 'sorted' ? results : [];
  const executing: Promise<void>[] = [];

  for (const [index, task] of tasks.entries()) {
    const promise: Promise<void> = task()
      .then(result => {
        if (ordering === 'completion') completionResults.push(result);
        else sortedResults[index] = result;
      })
      .catch(error => {
        errors[index] = error;
      })
      .finally(() => {
        const indexOfPromise = executing.indexOf(promise);
        if (indexOfPromise !== -1) executing.splice(indexOfPromise, 1);
      });

    executing.push(promise);

    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  if (ordering === 'sorted')
    return { results: sortedResults as Array<T | undefined>, errors };
  return { results: completionResults as Array<T | undefined>, errors };
}
