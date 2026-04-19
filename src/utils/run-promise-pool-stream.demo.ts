import { randomInt } from './random-int';
import type { Task } from './run-promise-pool';
import { runPromisePoolStream } from './run-promise-pool-stream';
import { wait } from './wait';

function createTasks({
  size,
  minDelay,
  maxDelay,
}: {
  size: number;
  minDelay: number;
  maxDelay: number;
}): Task<number>[] {
  return Array.from(
    { length: size },
    (_, id) => () =>
      wait(randomInt({ min: minDelay, max: maxDelay })).then(() => id + 1),
  );
}

async function main() {
  const tasks = createTasks({ size: 1000, minDelay: 500, maxDelay: 600 });
  const asyncGenerator = runPromisePoolStream({
    tasks,
    bufferLimit: 5,
    concurrencyLimit: 200,
    onBufferLimitReached: () =>
      console.info('Waiting for space to schedule more tasks...'),
  });
  let total = 0;
  for await (const { index, error, result } of asyncGenerator) {
    if (error) console.error(`Task ${index} failed with error`, error);
    else console.info(`Task ${index} finished with result`, result);
    total++;
  }
  console.info(total);
}

if (import.meta.main) {
  await main();
}
