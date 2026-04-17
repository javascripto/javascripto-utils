import { wait } from './wait';

export async function retryPromise<T, E = Error>(
  factory: () => Promise<T>,
  {
    retryLimit,
    delay,
  }: {
    retryLimit: number;
    delay: number;
  },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryLimit; attempt++) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (attempt < retryLimit) await wait(delay);
    }
  }
  if (lastError instanceof Error) throw lastError as E;
  throw new Error(String(lastError));
}
