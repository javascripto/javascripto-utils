import {
  BLUE,
  CYAN,
  GREEN,
  MAGENTA,
  RESET,
  YELLOW,
} from '../constants/ansi-colors';
import { wait } from '.';
import { randomInt } from './random-int';

type Task<T = unknown> = () => Promise<T>;

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

async function main() {
  function createRandomTimeTask(id: number, maxDelay: number): Task<number> {
    return async (): Promise<number> => {
      const randomTime = randomInt({ max: maxDelay });
      await wait(randomTime);
      console.info(
        `Task ${BLUE}${id}${RESET} completed in ${GREEN}${randomTime}${RESET} ms`,
      );
      return id;
    };
  }
  const now = Date.now();
  const averageRequestPing = 50; // exemplo de ping de um servidor
  const maxDelay = averageRequestPing;
  const tasksSize = 50_000; // exemplo de 50k requests numa api
  const concurrencyLimit = 300; // melhor numero encontrado em benchmarks

  console.info(`${YELLOW}Creating tasks${RESET}`);
  await wait(1000);

  const tasks = Array.from({ length: tasksSize }, (_, index) =>
    createRandomTimeTask(index + 1, maxDelay),
  );

  console.info(`${YELLOW}Starting tasks execution${RESET}`);
  await wait(1000);

  const { results: tasksResults, errors } = await runPromisePool({
    tasks,
    concurrencyLimit,
  });
  const totalTime = Date.now() - now;

  console.info(`${GREEN}Tasks completed:${RESET}`, tasksResults.length);
  console.info(
    `${CYAN}Unique tasks results:${RESET}`,
    new Set(tasksResults).size,
  );
  console.info(
    `${MAGENTA}First 21 tasks results:${RESET}`,
    tasksResults.slice(0, 21),
  );
  const errorsCount = errors.filter(Boolean).length;
  if (errorsCount > 0)
    console.warn(`${YELLOW}Tasks with errors:${RESET}`, errorsCount);

  console.info(
    `${BLUE}Total execution time:${RESET} ${(totalTime / 1000).toFixed(2)} s`,
  );
}

if (import.meta.main) {
  await main();
}
