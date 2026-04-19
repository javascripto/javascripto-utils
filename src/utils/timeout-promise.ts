export function timeoutPromise<T = unknown>(
  promise: Promise<T>,
  milliseconds?: number | null | undefined,
): Promise<T> {
  if (!milliseconds) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new PromiseTimeoutError(milliseconds)),
        milliseconds,
      );
    }),
  ]);
}

export class PromiseTimeoutError extends Error {
  constructor(milliseconds: number) {
    super(`Promise timed out after ${milliseconds} milliseconds`);
    this.name = 'PromiseTimeoutError';
  }
}
