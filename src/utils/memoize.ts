// biome-ignore lint/suspicious/noExplicitAny: generic function that accepts any function type
type AnyFunction = (...args: any[]) => any;

/**
 * @description Memoizes the result of a function based on its arguments.
 * If the function is called again with the same arguments, the cached result
 * is returned instead of executing the function again.
 * @returns A new function that memoizes the results of the original function.
 */
export function memoize<T extends AnyFunction>(originalFunction: T) {
  const returnCache = new Map<string, ReturnType<typeof originalFunction>>();
  function decoratedFunction(...args: Parameters<T>) {
    const cacheKey = JSON.stringify(args);
    if (!returnCache.has(cacheKey)) {
      const result = originalFunction(...args);
      returnCache.set(cacheKey, result);
    }
    return returnCache.get(cacheKey)!;
  }
  Object.defineProperty(decoratedFunction, 'name', {
    value: originalFunction.name ?? decoratedFunction.name,
  });
  return decoratedFunction;
}
