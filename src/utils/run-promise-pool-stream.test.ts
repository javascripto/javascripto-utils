import { randomInt } from './random-int';
import type { Task } from './run-promise-pool-async';
import { runPromisePoolStream } from './run-promise-pool-stream';
import { wait } from './wait';

async function main() {
  const tasks: Task<number>[] = Array.from(
    { length: 1000 },
    (_, id) => () => wait(randomInt({ min: 500, max: 600 })).then(() => id + 1),
  );
  const asyncGenerator = runPromisePoolStream({
    tasks,
    concurrencyLimit: 200,
    bufferLimit: 5,
    onBufferLimitReached: () => {
      console.info('Waiting for space to schedule more tasks...');
    },
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
