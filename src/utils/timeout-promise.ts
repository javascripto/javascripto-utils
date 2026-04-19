import { isNullOrUndefined } from './is-null-or-undefined';

export function timeoutPromise<T = unknown>(
  promise: Promise<T>,
  milliseconds?: number | null | undefined,
  signal?: AbortSignal,
): Promise<T> {
  if (isNullOrUndefined(milliseconds) && !signal) return promise;

  return new Promise<T>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const onAbort = () => {
      cleanup();
      reject(new AbortError());
    };

    const cleanup = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    if (!isNullOrUndefined(milliseconds)) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new PromiseTimeoutError(milliseconds));
      }, milliseconds);
    }

    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    promise
      .then(value => {
        cleanup();
        resolve(value);
      })
      .catch(err => {
        cleanup();
        reject(err);
      });
  });
}

export class PromiseTimeoutError extends Error {
  constructor(milliseconds: number) {
    super(`Promise timed out after ${milliseconds} milliseconds`);
    this.name = 'PromiseTimeoutError';
  }
}

export class AbortError extends Error {
  constructor() {
    super('Operation aborted');
    this.name = 'AbortError';
  }
}
