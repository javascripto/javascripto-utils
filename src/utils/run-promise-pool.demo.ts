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
import { runPromisePool, type Task } from './run-promise-pool';


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

async function main() {
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
